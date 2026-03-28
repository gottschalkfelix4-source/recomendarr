"""Radarr API connector for managing movies."""
import httpx
from typing import Optional, List, Dict, Any


class RadarrConnector:
    def __init__(self, url: str, api_key: str):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to the Radarr API."""
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
            raise Exception(f"HTTP error from Radarr: {e.response.status_code} - {e.response.text}")

    async def get_root_folders(self) -> List[Dict[str, Any]]:
        """Get configured root folders from Radarr."""
        return await self._make_request("/rootfolder")

    async def get_quality_profiles(self) -> List[Dict[str, Any]]:
        """Get quality profiles from Radarr."""
        return await self._make_request("/qualityprofile")

    async def search_movies(self, title: str) -> List[Dict[str, Any]]:
        """Search for movies in Radarr."""
        response = await self._make_request(f"/movie/lookup?term={title}")
        return response

    async def get_movie_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        """Get a specific movie by title."""
        movies = await self._make_request("/movie")
        for movie in movies:
            if movie.get("title", "").lower() == title.lower():
                return movie
        return None

    async def add_movie(
        self,
        title: str,
        tmdb_id: int,
        quality_profile_id: Optional[int] = None,
        root_folder: Optional[str] = None,
        search_for_movie: bool = True,
    ) -> Dict[str, Any]:
        """Add a movie to Radarr. Auto-detects root folder and quality profile if not provided."""
        if not root_folder:
            folders = await self.get_root_folders()
            if not folders:
                raise Exception("No root folders configured in Radarr")
            root_folder = folders[0].get("path")

        if not quality_profile_id:
            from config import settings as app_settings
            configured = app_settings.RADARR_QUALITY_PROFILE
            if configured:
                quality_profile_id = configured
            else:
                profiles = await self.get_quality_profiles()
                quality_profile_id = profiles[0].get("id", 1) if profiles else 1

        movie_data = {
            "title": title,
            "tmdbId": tmdb_id,
            "qualityProfileId": quality_profile_id,
            "rootFolderPath": root_folder,
            "addOptions": {
                "searchForMovie": search_for_movie
            },
            "monitored": True,
        }

        return await self._make_request("/movie", method="POST", data=movie_data)

    async def check_movie_exists(self, tmdb_id: int) -> bool:
        """Check if a movie already exists in Radarr."""
        movies = await self._make_request("/movie")
        for movie in movies:
            if movie.get("tmdbId") == tmdb_id:
                return True
        return False

    async def test_connection(self) -> bool:
        """Test if Radarr connection works."""
        try:
            await self._make_request("/system/status")
            return True
        except Exception:
            return False

    async def check_movie_exists_by_title(self, title: str) -> bool:
        """Check if movie exists by title."""
        movies = await self._make_request("/movie")
        for movie in movies:
            if movie.get("title", "").lower() == title.lower():
                return True
        return False


def get_radarr_connector() -> Optional[RadarrConnector]:
    """Create a Radarr connector from settings."""
    from config import settings

    if settings.RADARR_URL and settings.RADARR_API_KEY:
        return RadarrConnector(settings.RADARR_URL, settings.RADARR_API_KEY)
    return None
