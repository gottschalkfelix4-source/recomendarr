"""AI connector for OpenAI-compatible providers."""
import httpx
from typing import Optional, List, Dict, Any
import json


class AIConnector:
    def __init__(self, base_url: str, api_key: str, model: str = "gpt-4o",
                 temperature: float = 0.7):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.client = httpx.AsyncClient(timeout=180.0)

    async def close(self):
        await self.client.aclose()

    async def _make_request(self, messages: List[Dict[str, str]],
                            temperature: Optional[float] = None) -> Optional[str]:
        """Make a request to the AI provider."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
        }

        last_error = None
        for attempt in range(2):  # 1 retry on timeout
            try:
                response = await self.client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except httpx.TimeoutException as e:
                last_error = f"Timeout after {self.client.timeout.read}s (attempt {attempt + 1}/2)"
                if attempt == 0:
                    continue  # retry once
                raise Exception(f"AI request timed out: {last_error}")
            except httpx.HTTPStatusError as e:
                error_text = e.response.text[:500] if e.response else "No response"
                raise Exception(f"AI provider error {e.response.status_code}: {error_text}")
            except Exception as e:
                err_type = type(e).__name__
                err_msg = str(e) or "unknown error"
                raise Exception(f"AI request failed ({err_type}): {err_msg}")

    async def analyze_watch_history(
        self,
        watch_history: List[Dict[str, Any]],
        num_movies: int = 10,
        num_series: int = 10,
        max_titles: int = 30,
        custom_prompt: str = "",
        exclude_titles: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Analyze watch history and generate recommendations."""
        history_str = self._format_history_for_ai(watch_history, max_titles=max_titles)

        exclude_block = ""
        if exclude_titles:
            titles_list = "\n".join(f"- {t}" for t in exclude_titles)
            exclude_block = f"""
IMPORTANT: The following titles have ALREADY been suggested or are already in the library.
Do NOT recommend any of these titles again. Suggest completely different titles instead:
{titles_list}
"""

        system_prompt = f"""You are a media recommendation expert. Your task is to analyze
a user's watch history and suggest new TV series and movies they would enjoy.

Return your response as a JSON object with this structure:
{{
    "recommendations": [
        {{
            "title": "Series or Movie Name",
            "media_type": "series" or "movie",
            "rating": 8.5,
            "reason": "Why this recommendation was made",
            "genres": ["genre1", "genre2"]
        }}
    ]
}}

You MUST return exactly {num_movies} movies (media_type: "movie") and exactly {num_series} series (media_type: "series").
That is {num_movies + num_series} recommendations total.

IMPORTANT DIVERSITY RULE: Maximum 2 titles per genre. For example, at most 2 anime movies, at most 2 sci-fi series, etc.
Spread your recommendations across many different genres to ensure variety.
Do NOT recommend titles the user has already watched.
{exclude_block}{f"Additional instructions: {custom_prompt}" if custom_prompt else ""}"""

        user_prompt = f"""Here is the user's watch history:

{history_str}

Please analyze this watch history and suggest exactly {num_movies} movies and {num_series} series
the user might enjoy. Ensure genre diversity — max 2 per genre. Consider genres, pacing, themes, and quality."""

        response = await self._make_request([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        # Parse JSON response
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            return json.loads(response)
        except json.JSONDecodeError:
            raise Exception(f"Failed to parse AI response as JSON: {response}")

    def _format_history_for_ai(self, watch_history: List[Dict[str, Any]],
                                max_titles: int = 30) -> str:
        """Format watch history for the AI prompt."""
        if not watch_history:
            return "No watch history available."

        # Group by show/movie using grandparent_title for episodes
        shows: Dict[tuple, Dict[str, Any]] = {}
        for item in watch_history:
            # For episodes, group by series name
            if item.get("media_type") == "episode" and item.get("grandparent_title"):
                display_title = item["grandparent_title"]
            else:
                display_title = item.get("title") or item.get("name") or "Unknown"

            media_type = item.get("media_type", "unknown")
            key = (display_title, media_type)

            if key not in shows:
                shows[key] = {
                    "title": display_title,
                    "media_type": media_type,
                    "watch_count": 0,
                    "total_duration": 0,
                    "genres": item.get("genres", []),
                }
            shows[key]["watch_count"] += 1
            shows[key]["total_duration"] += item.get("duration", 0)

        # Sort by watch count (most watched first), limit
        sorted_shows = sorted(shows.values(), key=lambda x: x["watch_count"], reverse=True)

        lines = []
        for item in sorted_shows[:max_titles]:
            duration_hrs = round(item["total_duration"] / 3600, 1) if item["total_duration"] else 0
            line = f"- {item['title']} ({item['media_type']}) - {item['watch_count']}x watched"
            if duration_hrs > 0:
                line += f", {duration_hrs}h total"
            if item.get("genres"):
                line += f", Genres: {', '.join(item['genres'])}"
            lines.append(line)

        return "\n".join(lines)

    async def generate_search_query(
        self,
        recommendation_title: str,
        media_type: str,
    ) -> str:
        """Generate a refined search query for Sonarr/Radarr."""
        system_prompt = """You are a search query optimizer. Your task is to take
        a media title and media type and return a clean search query that would
        work well with Sonarr (for series) or Radarr (for movies).

        Return ONLY the search query string, nothing else.
        """

        user_prompt = f"""Create a clean search query for {media_type} "{recommendation_title}".
        Remove any year information, just return the clean title.
        Do not include any explanation, just the search query."""

        return await self._make_request([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

    async def test_connection(self) -> bool:
        """Test if AI provider connection works."""
        try:
            response = await self._make_request([
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello"},
            ])
            return bool(response)
        except Exception:
            return False


def get_ai_connector() -> Optional[AIConnector]:
    """Create an AI connector from settings."""
    from config import settings

    if settings.AI_BASE_URL and settings.AI_API_KEY:
        return AIConnector(
            settings.AI_BASE_URL,
            settings.AI_API_KEY,
            settings.AI_MODEL,
            settings.AI_TEMPERATURE,
        )
    return None
