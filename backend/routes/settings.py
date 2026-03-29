"""Settings API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from config import settings
from db import db
from connectors.tautulli import TautulliConnector
from connectors.sonarr import SonarrConnector
from connectors.radarr import RadarrConnector
from connectors.ai import AIConnector
from connectors.tmdb import TMDBConnector
from connectors.plex import PlexConnector

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsRequest(BaseModel):
    tautulli_url: Optional[str] = None
    tautulli_api_key: Optional[str] = None
    sonarr_url: Optional[str] = None
    sonarr_api_key: Optional[str] = None
    radarr_url: Optional[str] = None
    radarr_api_key: Optional[str] = None
    plex_url: Optional[str] = None
    plex_token: Optional[str] = None
    ai_base_url: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    tmdb_api_key: Optional[str] = None
    history_source: Optional[str] = None
    sonarr_quality_profile: Optional[str] = None
    sonarr_monitored: Optional[str] = None
    radarr_quality_profile: Optional[str] = None
    radarr_monitored: Optional[str] = None
    ai_history_depth: Optional[str] = None
    ai_max_titles: Optional[str] = None
    ai_num_recommendations: Optional[str] = None
    ai_temperature: Optional[str] = None
    ai_custom_prompt: Optional[str] = None


class SettingsResponse(BaseModel):
    success: bool
    message: str
    settings: dict


class TestConnectionRequest(BaseModel):
    type: str  # "tautulli", "sonarr", "radarr", "ai"
    url: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


MASKED = "********"


def sanitize_settings(settings_dict: dict) -> dict:
    """Sanitize settings response - mask API keys."""
    return {
        "tautulli_url": settings.TAUTULLI_URL,
        "tautulli_api_key": MASKED if settings.TAUTULLI_API_KEY else None,
        "sonarr_url": settings.SONARR_URL,
        "sonarr_api_key": MASKED if settings.SONARR_API_KEY else None,
        "radarr_url": settings.RADARR_URL,
        "radarr_api_key": MASKED if settings.RADARR_API_KEY else None,
        "plex_url": settings.PLEX_URL,
        "plex_token": MASKED if settings.PLEX_TOKEN else None,
        "ai_base_url": settings.AI_BASE_URL,
        "ai_api_key": MASKED if settings.AI_API_KEY else None,
        "ai_model": settings.AI_MODEL,
        "tmdb_api_key": MASKED if settings.TMDB_API_KEY else None,
        "history_source": settings.HISTORY_SOURCE,
        "sonarr_quality_profile": str(settings.SONARR_QUALITY_PROFILE),
        "sonarr_monitored": str(settings.SONARR_MONITORED).lower(),
        "radarr_quality_profile": str(settings.RADARR_QUALITY_PROFILE),
        "radarr_monitored": str(settings.RADARR_MONITORED).lower(),
        "ai_history_depth": str(settings.AI_HISTORY_DEPTH),
        "ai_max_titles": str(settings.AI_MAX_TITLES),
        "ai_num_recommendations": str(settings.AI_NUM_RECOMMENDATIONS),
        "ai_temperature": str(settings.AI_TEMPERATURE),
        "ai_custom_prompt": settings.AI_CUSTOM_PROMPT,
    }


@router.get("/", response_model=SettingsResponse)
async def get_settings():
    """Get current settings."""
    return SettingsResponse(
        success=True,
        message="Settings retrieved successfully",
        settings=sanitize_settings({})
    )


@router.post("/", response_model=SettingsResponse)
async def update_settings(request: SettingsRequest):
    """Update settings (persist to database). Skip masked values."""
    def should_save(value: str | None) -> bool:
        return value is not None and value != MASKED

    if should_save(request.tautulli_url):
        db.set_setting("tautulli_url", request.tautulli_url)
    if should_save(request.tautulli_api_key):
        db.set_setting("tautulli_api_key", request.tautulli_api_key)
    if should_save(request.sonarr_url):
        db.set_setting("sonarr_url", request.sonarr_url)
    if should_save(request.sonarr_api_key):
        db.set_setting("sonarr_api_key", request.sonarr_api_key)
    if should_save(request.radarr_url):
        db.set_setting("radarr_url", request.radarr_url)
    if should_save(request.radarr_api_key):
        db.set_setting("radarr_api_key", request.radarr_api_key)
    if should_save(request.plex_url):
        db.set_setting("plex_url", request.plex_url)
    if should_save(request.plex_token):
        db.set_setting("plex_token", request.plex_token)
    if should_save(request.ai_base_url):
        db.set_setting("ai_base_url", request.ai_base_url)
    if should_save(request.ai_api_key):
        db.set_setting("ai_api_key", request.ai_api_key)
    if should_save(request.ai_model):
        db.set_setting("ai_model", request.ai_model)
    if should_save(request.tmdb_api_key):
        db.set_setting("tmdb_api_key", request.tmdb_api_key)
    if request.history_source is not None and request.history_source in ("tautulli", "plex", "both"):
        db.set_setting("history_source", request.history_source)
    if request.sonarr_quality_profile is not None:
        db.set_setting("sonarr_quality_profile", request.sonarr_quality_profile)
    if request.sonarr_monitored is not None:
        db.set_setting("sonarr_monitored", request.sonarr_monitored)
    if request.radarr_quality_profile is not None:
        db.set_setting("radarr_quality_profile", request.radarr_quality_profile)
    if request.radarr_monitored is not None:
        db.set_setting("radarr_monitored", request.radarr_monitored)
    if request.ai_history_depth is not None:
        db.set_setting("ai_history_depth", request.ai_history_depth)
    if request.ai_max_titles is not None:
        db.set_setting("ai_max_titles", request.ai_max_titles)
    if request.ai_num_recommendations is not None:
        db.set_setting("ai_num_recommendations", request.ai_num_recommendations)
    if request.ai_temperature is not None:
        db.set_setting("ai_temperature", request.ai_temperature)
    if request.ai_custom_prompt is not None:
        db.set_setting("ai_custom_prompt", request.ai_custom_prompt)

    return SettingsResponse(
        success=True,
        message="Settings updated successfully",
        settings=sanitize_settings({})
    )


@router.post("/test", response_model=dict)
async def test_connection(request: TestConnectionRequest):
    """Test connection to a service."""
    try:
        if request.type == "tautulli":
            if not request.url or not request.api_key:
                return {"success": False, "message": "Missing required fields: url and api_key"}
            connector = TautulliConnector(request.url, request.api_key)
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "Tautulli connection successful" if result else "Tautulli connection failed"}

        elif request.type == "sonarr":
            if not request.url or not request.api_key:
                return {"success": False, "message": "Missing required fields: url and api_key"}
            connector = SonarrConnector(request.url, request.api_key)
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "Sonarr connection successful" if result else "Sonarr connection failed"}

        elif request.type == "radarr":
            if not request.url or not request.api_key:
                return {"success": False, "message": "Missing required fields: url and api_key"}
            connector = RadarrConnector(request.url, request.api_key)
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "Radarr connection successful" if result else "Radarr connection failed"}

        elif request.type == "ai":
            if not request.base_url or not request.api_key:
                return {"success": False, "message": "Missing required fields: base_url and api_key"}
            connector = AIConnector(
                request.base_url,
                request.api_key
            )
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "AI provider connection successful" if result else "AI provider connection failed"}

        elif request.type == "plex":
            if not request.url or not request.api_key:
                return {"success": False, "message": "Missing required fields: url and api_key (token)"}
            connector = PlexConnector(request.url, request.api_key)
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "Plex connection successful" if result else "Plex connection failed"}

        elif request.type == "tmdb":
            if not request.api_key:
                return {"success": False, "message": "Missing required field: api_key"}
            connector = TMDBConnector(request.api_key)
            result = await connector.test_connection()
            await connector.close()
            return {"success": result, "message": "TMDB connection successful" if result else "TMDB connection failed"}

        else:
            return {"success": False, "message": f"Unknown service type: {request.type}"}

    except Exception as e:
        return {"success": False, "message": f"Connection test failed: {str(e)}"}


@router.get("/quality-profiles")
async def get_quality_profiles():
    """Fetch quality profiles from Sonarr and Radarr."""
    result = {"sonarr": [], "radarr": []}

    if settings.SONARR_URL and settings.SONARR_API_KEY:
        try:
            connector = SonarrConnector(settings.SONARR_URL, settings.SONARR_API_KEY)
            profiles = await connector.get_quality_profiles()
            await connector.close()
            result["sonarr"] = [{"id": p["id"], "name": p["name"]} for p in profiles]
        except Exception:
            pass

    if settings.RADARR_URL and settings.RADARR_API_KEY:
        try:
            connector = RadarrConnector(settings.RADARR_URL, settings.RADARR_API_KEY)
            profiles = await connector.get_quality_profiles()
            await connector.close()
            result["radarr"] = [{"id": p["id"], "name": p["name"]} for p in profiles]
        except Exception:
            pass

    return result


@router.delete("/", response_model=SettingsResponse)
async def delete_settings():
    """Delete all settings (resets to defaults)."""
    settings_keys = [
        "tautulli_url", "tautulli_api_key",
        "sonarr_url", "sonarr_api_key",
        "radarr_url", "radarr_api_key",
        "plex_url", "plex_token",
        "ai_base_url", "ai_api_key", "ai_model",
        "tmdb_api_key", "history_source",
        "ai_history_depth", "ai_max_titles", "ai_num_recommendations",
        "ai_temperature", "ai_custom_prompt"
    ]
    for key in settings_keys:
        db.delete_setting(key)

    return SettingsResponse(
        success=True,
        message="All settings deleted",
        settings=sanitize_settings({})
    )
