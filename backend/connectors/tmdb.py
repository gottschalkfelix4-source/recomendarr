"""TMDB connector for fetching movie/series poster images."""
import httpx
from typing import Optional, Dict, Any

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


class TMDBConnector:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=15.0)

    async def close(self):
        await self.client.aclose()

    async def search(self, title: str, media_type: str = "movie") -> Optional[Dict[str, Any]]:
        """Search TMDB for a title and return poster info."""
        endpoint = "search/tv" if media_type == "series" else "search/movie"
        url = f"{TMDB_BASE_URL}/{endpoint}"

        try:
            response = await self.client.get(url, params={
                "api_key": self.api_key,
                "query": title,
                "language": "de-DE",
                "page": 1,
            })
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

            if not results:
                return None

            result = results[0]
            poster_path = result.get("poster_path")

            return {
                "tmdb_id": result.get("id"),
                "poster_path": poster_path,
                "poster_url": f"{TMDB_IMAGE_BASE}/w300{poster_path}" if poster_path else None,
                "backdrop_path": result.get("backdrop_path"),
                "overview": result.get("overview"),
                "vote_average": result.get("vote_average"),
            }
        except Exception:
            return None

    async def search_batch(self, recommendations: list) -> list:
        """Enrich a list of recommendations with TMDB poster data."""
        enriched = []
        for rec in recommendations:
            title = rec.get("title", "")
            media_type = rec.get("media_type", "movie")

            tmdb_data = await self.search(title, media_type)

            if tmdb_data:
                rec["poster_url"] = tmdb_data.get("poster_url")
                rec["tmdb_id"] = tmdb_data.get("tmdb_id")
            else:
                rec["poster_url"] = None
                rec["tmdb_id"] = None

            enriched.append(rec)
        return enriched

    async def test_connection(self) -> bool:
        """Test TMDB API connection."""
        try:
            response = await self.client.get(
                f"{TMDB_BASE_URL}/configuration",
                params={"api_key": self.api_key},
            )
            return response.status_code == 200
        except Exception:
            return False


def get_tmdb_connector() -> Optional[TMDBConnector]:
    """Create a TMDB connector from settings."""
    from config import settings

    if settings.TMDB_API_KEY:
        return TMDBConnector(settings.TMDB_API_KEY)
    return None
