"""Global settings management - loads from database, with .env fallback."""
import os
from typing import Optional


def get_db_setting(key: str, default: str = None):
    """Get a setting from the database, with fallback to environment variable."""
    from db import db

    value = db.get_setting(key)
    if value is not None:
        return value

    # Fallback to environment variable if not in database
    env_value = os.environ.get(key.upper().replace("_", ""), os.environ.get(key, default))
    return env_value


class Settings:
    """Settings class with dynamic loading from database."""

    def __init__(self):
        self._loaded = False

    def _get_setting(self, key: str, default: str = None) -> str | None:
        return get_db_setting(key, default)

    @property
    def TAUTULLI_URL(self) -> str | None:
        return self._get_setting("tautulli_url")

    @property
    def TAUTULLI_API_KEY(self) -> str | None:
        return self._get_setting("tautulli_api_key")

    @property
    def SONARR_URL(self) -> str | None:
        return self._get_setting("sonarr_url")

    @property
    def SONARR_API_KEY(self) -> str | None:
        return self._get_setting("sonarr_api_key")

    @property
    def RADARR_URL(self) -> str | None:
        return self._get_setting("radarr_url")

    @property
    def RADARR_API_KEY(self) -> str | None:
        return self._get_setting("radarr_api_key")

    @property
    def PLEX_URL(self) -> str | None:
        return self._get_setting("plex_url")

    @property
    def PLEX_TOKEN(self) -> str | None:
        return self._get_setting("plex_token")

    @property
    def AI_BASE_URL(self) -> str:
        return self._get_setting("ai_base_url", "https://api.openai.com/v1")

    @property
    def AI_API_KEY(self) -> str | None:
        return self._get_setting("ai_api_key")

    @property
    def AI_MODEL(self) -> str:
        return self._get_setting("ai_model", "gpt-4o")

    @property
    def TMDB_API_KEY(self) -> str | None:
        return self._get_setting("tmdb_api_key")

    # AI recommendation settings
    @property
    def HISTORY_SOURCE(self) -> str:
        """'tautulli', 'plex', or 'both'"""
        return self._get_setting("history_source", "tautulli") or "tautulli"

    @property
    def AI_HISTORY_DEPTH(self) -> int:
        val = self._get_setting("ai_history_depth", "200")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 200

    @property
    def AI_MAX_TITLES(self) -> int:
        val = self._get_setting("ai_max_titles", "30")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 30

    @property
    def AI_NUM_RECOMMENDATIONS(self) -> int:
        val = self._get_setting("ai_num_recommendations", "10")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 10

    @property
    def AI_TEMPERATURE(self) -> float:
        val = self._get_setting("ai_temperature", "0.7")
        try:
            return float(val)
        except (ValueError, TypeError):
            return 0.7

    @property
    def AI_CUSTOM_PROMPT(self) -> str:
        return self._get_setting("ai_custom_prompt", "") or ""

    # Auto-run settings
    @property
    def AUTORUN_ENABLED(self) -> bool:
        return self._get_setting("autorun_enabled", "false") == "true"

    @property
    def AUTORUN_INTERVAL_HOURS(self) -> int:
        val = self._get_setting("autorun_interval_hours", "24")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 24

    @property
    def AUTORUN_MAX_MOVIES(self) -> int:
        val = self._get_setting("autorun_max_movies", "5")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 5

    @property
    def AUTORUN_MAX_SERIES(self) -> int:
        val = self._get_setting("autorun_max_series", "5")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 5

    @property
    def AUTORUN_MIN_RATING(self) -> float:
        val = self._get_setting("autorun_min_rating", "7.0")
        try:
            return float(val)
        except (ValueError, TypeError):
            return 7.0

    @property
    def AUTORUN_TEMPERATURE(self) -> float:
        val = self._get_setting("autorun_temperature")
        if val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
        return self.AI_TEMPERATURE

    @property
    def AUTORUN_USERS(self) -> str:
        return self._get_setting("autorun_users", "all") or "all"

    @property
    def SONARR_QUALITY_PROFILE(self) -> int:
        val = self._get_setting("sonarr_quality_profile", "0")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 0  # 0 = auto-detect first

    @property
    def SONARR_MONITORED(self) -> bool:
        return self._get_setting("sonarr_monitored", "true") != "false"

    @property
    def RADARR_MONITORED(self) -> bool:
        return self._get_setting("radarr_monitored", "true") != "false"

    @property
    def RADARR_QUALITY_PROFILE(self) -> int:
        val = self._get_setting("radarr_quality_profile", "0")
        try:
            return int(val)
        except (ValueError, TypeError):
            return 0


# Global settings instance
settings = Settings()
