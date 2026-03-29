"""Sonarr API connector for managing TV series."""
import httpx
from typing import Optional, List, Dict, Any


class SonarrConnector:
    def __init__(self, url: str, api_key: str):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to the Sonarr API."""
        url = f"{self.url}/api/v3{endpoint}"
        headers = {"X-Api-Key": self.api_key}

        try:
            if method == "GET":
                response = await self.client.get(url, headers=headers)
            elif method == "POST":
                response = await self.client.post(url, json=data, headers=headers)
            elif method == "PUT":
                response = await self.client.put(url, json=data, headers=headers)
            else:
                response = await self.client.request(method, url, json=data, headers=headers)

            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP error from Sonarr: {e.response.status_code} - {e.response.text}")

    async def get_root_folders(self) -> List[Dict[str, Any]]:
        """Get configured root folders from Sonarr."""
        return await self._make_request("/rootfolder")

    async def get_quality_profiles(self) -> List[Dict[str, Any]]:
        """Get quality profiles from Sonarr."""
        return await self._make_request("/qualityprofile")

    async def search_series(self, title: str) -> List[Dict[str, Any]]:
        """Search for a TV series in Sonarr."""
        response = await self._make_request(f"/series/lookup?term={title}")
        return response

    async def get_series_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        """Get a specific series by title."""
        series_list = await self._make_request("/series")
        for series in series_list:
            if series.get("title", "").lower() == title.lower():
                return series
        return None

    async def add_series(
        self,
        title: str,
        tvdb_id: int,
        quality_profile_id: Optional[int] = None,
        root_folder: Optional[str] = None,
        season_folder: bool = True,
        search_for_missing_episodes: bool = True,
    ) -> Dict[str, Any]:
        """Add a series to Sonarr. Auto-detects root folder and quality profile if not provided."""
        if not root_folder:
            folders = await self.get_root_folders()
            if not folders:
                raise Exception("No root folders configured in Sonarr")
            root_folder = folders[0].get("path")

        if not quality_profile_id:
            from config import settings as app_settings
            configured = app_settings.SONARR_QUALITY_PROFILE
            if configured:
                quality_profile_id = configured
            else:
                profiles = await self.get_quality_profiles()
                quality_profile_id = profiles[0].get("id", 1) if profiles else 1

        from config import settings as app_settings
        monitored = app_settings.SONARR_MONITORED

        series_data = {
            "title": title,
            "tvdbId": tvdb_id,
            "qualityProfileId": quality_profile_id,
            "rootFolderPath": root_folder,
            "seasonFolder": season_folder,
            "monitored": monitored,
            "addOptions": {
                "searchForMissingEpisodes": search_for_missing_episodes
            },
        }

        return await self._make_request("/series", method="POST", data=series_data)

    async def check_series_exists(self, tvdb_id: int) -> bool:
        """Check if a series already exists in Sonarr."""
        series_list = await self._make_request("/series")
        for series in series_list:
            if series.get("tvdbId") == tvdb_id:
                return True
        return False

    async def test_connection(self) -> bool:
        """Test if Sonarr connection works."""
        try:
            await self._make_request("/system/status")
            return True
        except Exception:
            return False

    async def check_series_exists_by_title(self, title: str) -> bool:
        """Check if series exists by title."""
        series_list = await self._make_request("/series")
        for series in series_list:
            if series.get("title", "").lower() == title.lower():
                return True
        return False


def get_sonarr_connector() -> Optional[SonarrConnector]:
    """Create a Sonarr connector from settings."""
    from config import settings

    if settings.SONARR_URL and settings.SONARR_API_KEY:
        return SonarrConnector(settings.SONARR_URL, settings.SONARR_API_KEY)
    return None
