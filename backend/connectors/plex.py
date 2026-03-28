"""Plex API connector for fetching watch history directly from Plex."""
import httpx
from datetime import datetime
from typing import Optional, List, Dict, Any
from models import WatchHistory, UserActivity


class PlexConnector:
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.token = token
        self.client = httpx.AsyncClient(timeout=30.0)
        self._account_map: Optional[Dict[int, str]] = None

    async def close(self):
        await self.client.aclose()

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Plex-Token": self.token,
            "Accept": "application/json",
        }

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GET request to the Plex API."""
        url = f"{self.url}{path}"
        try:
            response = await self.client.get(url, headers=self._headers(), params=params or {})
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Plex API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise Exception(f"Plex request failed: {str(e)}")

    async def _get_account_map(self) -> Dict[int, str]:
        """Build a map of accountID -> username from /accounts."""
        if self._account_map is not None:
            return self._account_map

        self._account_map = {}
        try:
            data = await self._get("/accounts")
            accounts = data.get("MediaContainer", {}).get("Account", [])
            for acc in accounts:
                acc_id = acc.get("id")
                name = acc.get("name", "").strip()
                if acc_id is not None and name:
                    self._account_map[int(acc_id)] = name
        except Exception:
            pass
        return self._account_map

    def _resolve_username(self, account_map: Dict[int, str], account_id: Any) -> Optional[str]:
        """Resolve an accountID to a username."""
        if account_id is None:
            return None
        try:
            return account_map.get(int(account_id))
        except (ValueError, TypeError):
            return None

    async def get_watch_history(
        self,
        username: Optional[str] = None,
        start: int = 0,
        length: int = 50,
        account_id: Optional[int] = None,
    ) -> List[WatchHistory]:
        """Fetch watch history from Plex's built-in history endpoint."""
        account_map = await self._get_account_map()

        # If filtering by username, find the matching accountID
        filter_account_id = None
        if username:
            for aid, name in account_map.items():
                if name.lower() == username.lower():
                    filter_account_id = aid
                    break
            if filter_account_id is None:
                # Username not found in accounts, return empty
                return []

        params: Dict[str, Any] = {
            "sort": "viewedAt:desc",
            "X-Plex-Container-Start": start,
            "X-Plex-Container-Size": length,
        }

        if filter_account_id is not None:
            params["accountID"] = filter_account_id
        elif account_id is not None:
            params["accountID"] = account_id

        data = await self._get("/status/sessions/history/all", params)
        metadata = data.get("MediaContainer", {}).get("Metadata", [])

        history = []
        for item in metadata:
            item_account_id = item.get("accountID")
            account_name = self._resolve_username(account_map, item_account_id)

            # Skip items from accounts with no name
            if not account_name:
                continue

            media_type = item.get("type", "unknown")  # "movie", "episode", "track"

            # Build display title
            grandparent = item.get("grandparentTitle")
            parent = item.get("parentTitle")
            if media_type == "episode" and grandparent:
                title = f"{grandparent} - {item.get('title', '')}"
            else:
                title = item.get("title", "Unknown")

            # Parse viewedAt timestamp
            viewed_at = item.get("viewedAt", 0)
            try:
                view_date = datetime.fromtimestamp(int(viewed_at)) if viewed_at else datetime.now()
            except (ValueError, OSError):
                view_date = datetime.now()

            history.append(WatchHistory(
                id=item.get("ratingKey"),
                username=account_name,
                title=title,
                parent_title=parent,
                grandparent_title=grandparent,
                media_type=media_type,
                view_date=view_date,
                watched=True,
                duration=item.get("duration", 0) // 1000 if item.get("duration") else 0,
                rating_key=str(item["ratingKey"]) if item.get("ratingKey") else None,
                parent_rating_key=str(item["parentRatingKey"]) if item.get("parentRatingKey") else None,
                grandparent_rating_key=str(item["grandparentRatingKey"]) if item.get("grandparentRatingKey") else None,
            ))

        return history

    async def get_users(self) -> List[UserActivity]:
        """Get all named users from Plex accounts."""
        account_map = await self._get_account_map()

        # Also scan recent history to get last_activity per user
        last_seen: Dict[str, datetime] = {}
        try:
            data = await self._get("/status/sessions/history/all", {
                "sort": "viewedAt:desc",
                "X-Plex-Container-Size": 500,
            })
            metadata = data.get("MediaContainer", {}).get("Metadata", [])
            for item in metadata:
                name = self._resolve_username(account_map, item.get("accountID"))
                if not name or name in last_seen:
                    continue
                viewed_at = item.get("viewedAt", 0)
                try:
                    last_seen[name] = datetime.fromtimestamp(int(viewed_at)) if viewed_at else datetime.now()
                except (ValueError, OSError):
                    last_seen[name] = datetime.now()
        except Exception:
            pass

        users = []
        for aid, name in account_map.items():
            users.append(UserActivity(
                user=name,
                total_watched=0,
                total_duration=0,
                last_activity=last_seen.get(name, datetime.now()),
                favorite_genres=[],
                watched_titles=[],
            ))

        # Sort by last activity
        users.sort(key=lambda u: u.last_activity, reverse=True)
        return users

    async def test_connection(self) -> bool:
        """Test Plex API connection."""
        try:
            data = await self._get("/")
            return "MediaContainer" in data
        except Exception:
            return False


def get_plex_connector() -> Optional[PlexConnector]:
    """Create a Plex connector from settings."""
    from config import settings

    if settings.PLEX_URL and settings.PLEX_TOKEN:
        return PlexConnector(settings.PLEX_URL, settings.PLEX_TOKEN)
    return None
