"""Tautulli API connector for fetching Plex watch history."""
import httpx
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from models import WatchHistory, UserActivity


class TautulliConnector:
    def __init__(self, url: str, api_key: str):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to the Tautulli API."""
        url = f"{self.url}/api/v2"
        params["apikey"] = self.api_key
        params["cmd"] = endpoint

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get("response", {}).get("result") == "success":
                return data.get("response", {})
            else:
                raise Exception(f"Tautulli API error: {data.get('response', {}).get('message', 'Unknown error')}")
        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP error from Tautulli: {e.response.status_code} - {e.response.text}")
        except json.JSONDecodeError:
            raise Exception("Failed to parse Tautulli API response")

    async def get_watch_history(
        self,
        username: Optional[str] = None,
        start: int = 0,
        length: int = 50,
        order_column: str = "date",
        order_dir: str = "desc",
    ) -> List[WatchHistory]:
        """Fetch watch history from Tautulli."""
        params = {
            "cmd": "get_history",
            "length": length,
            "start": start,
            "order_column": order_column,
            "order_dir": order_dir,
        }

        if username:
            params["user"] = username

        response = await self._make_request("get_history", params)
        data = response.get("data", {}).get("data", [])

        history = []
        for item in data:
            # Determine the best title to display
            title = item.get("full_title") or item.get("grandparent_title") or item.get("title") or "Unknown"

            # Tautulli may use "date" or "started" as unix timestamp
            ts = item.get("date") or item.get("started") or item.get("stopped") or 0
            try:
                view_date = datetime.fromtimestamp(int(ts)) if ts else datetime.now()
            except (ValueError, OSError):
                view_date = datetime.now()

            history.append(WatchHistory(
                id=item.get("reference_id") or item.get("id"),
                username=item.get("friendly_name") or item.get("user") or item.get("username"),
                title=title,
                parent_title=item.get("parent_title"),
                grandparent_title=item.get("grandparent_title"),
                media_type=item.get("media_type", "unknown"),
                view_date=view_date,
                watched=bool(item.get("watched_status", 0)),
                duration=item.get("duration", 0),
                rating_key=str(item["rating_key"]) if item.get("rating_key") is not None else None,
                parent_rating_key=str(item["parent_rating_key"]) if item.get("parent_rating_key") is not None else None,
                grandparent_rating_key=str(item["grandparent_rating_key"]) if item.get("grandparent_rating_key") is not None else None,
            ))
        return history

    async def get_users_activity(self) -> List[UserActivity]:
        """Get activity summary for all users."""
        # Try get_users_table first (more data), fall back to get_users
        try:
            response = await self._make_request("get_users_table", {"order_column": "last_seen", "order_dir": "desc", "length": 50})
            data = response.get("data", {}).get("data", [])
            users = []
            for user_data in data:
                users.append(UserActivity(
                    user=user_data.get("friendly_name") or user_data.get("username") or user_data.get("user", "Unknown"),
                    total_watched=user_data.get("plays", 0),
                    total_duration=user_data.get("duration", 0),
                    last_activity=datetime.fromtimestamp(user_data["last_seen"]) if user_data.get("last_seen") else datetime.now(),
                    favorite_genres=[],
                    watched_titles=[]
                ))
            return users
        except Exception:
            # Fallback: get_users (simpler endpoint)
            response = await self._make_request("get_users", {})
            data = response.get("data", [])
            users = []
            for user_data in data:
                users.append(UserActivity(
                    user=user_data.get("friendly_name") or user_data.get("username") or "Unknown",
                    total_watched=0,
                    total_duration=0,
                    last_activity=datetime.now(),
                    favorite_genres=[],
                    watched_titles=[]
                ))
            return users

    async def test_connection(self) -> bool:
        """Test if Tautulli connection works."""
        try:
            response = await self._make_request("get_status", {})
            return True
        except Exception:
            return False


def get_tautulli_connector() -> Optional[TautulliConnector]:
    """Create a Tautulli connector from settings."""
    from config import settings

    if settings.TAUTULLI_URL and settings.TAUTULLI_API_KEY:
        return TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
    return None
