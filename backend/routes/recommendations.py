"""Recommendations API routes."""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json

from config import settings
from connectors.tautulli import TautulliConnector
from connectors.sonarr import SonarrConnector, get_sonarr_connector
from connectors.radarr import RadarrConnector, get_radarr_connector
from connectors.ai import AIConnector, get_ai_connector
from connectors.tmdb import get_tmdb_connector
from models import GenerateRecommendationsRequest, AddToLibraryRequest, AddToLibraryResponse

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.post("/generate", response_model=dict)
async def generate_recommendations(request: GenerateRecommendationsRequest):
    """Generate recommendations based on watch history."""
    if not settings.TAUTULLI_URL or not settings.TAUTULLI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Tautulli not configured. Please set up settings first."
        )

    if not settings.AI_BASE_URL or not settings.AI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="AI provider not configured. Please set up settings first."
        )

    # Get watch history (configurable depth)
    history_depth = settings.AI_HISTORY_DEPTH
    tautulli = TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
    try:
        history = await tautulli.get_watch_history(
            username=request.username,
            length=history_depth,
        )
    finally:
        await tautulli.close()

    if not history:
        raise HTTPException(
            status_code=404,
            detail="No watch history found.",
        )

    # Convert to dict for AI
    history_dicts = [h.model_dump() for h in history]

    # Get AI recommendations with configurable params
    ai = AIConnector(
        settings.AI_BASE_URL, settings.AI_API_KEY,
        settings.AI_MODEL, settings.AI_TEMPERATURE,
    )
    try:
        result = await ai.analyze_watch_history(
            history_dicts,
            num_movies=10,
            num_series=10,
            max_titles=settings.AI_MAX_TITLES,
            custom_prompt=settings.AI_CUSTOM_PROMPT,
        )

        recommendations = result.get("recommendations", [])

        # Process recommendations
        processed = []
        for rec in recommendations:
            processed.append({
                "title": rec.get("title"),
                "media_type": rec.get("media_type"),
                "rating": rec.get("rating", 0),
                "reason": rec.get("reason"),
                "genres": rec.get("genres", []),
                "poster_url": None,
                "tmdb_id": None,
            })
    finally:
        await ai.close()

    # Enrich with TMDB posters if configured
    tmdb = get_tmdb_connector()
    if tmdb:
        try:
            processed = await tmdb.search_batch(processed)
        finally:
            await tmdb.close()

    return {
        "success": True,
        "data": processed,
        "total": len(processed),
    }


@router.post("/add", response_model=AddToLibraryResponse)
async def add_to_library(request: AddToLibraryRequest):
    """Add a recommendation to Sonarr or Radarr."""
    if request.media_type == "series":
        return await add_to_sonarr(request)
    elif request.media_type == "movie":
        return await add_to_radarr(request)
    else:
        return AddToLibraryResponse(
            success=False,
            message=f"Unknown media type: {request.media_type}",
        )


async def add_to_sonarr(request: AddToLibraryRequest) -> AddToLibraryResponse:
    """Add a series to Sonarr."""
    if not settings.SONARR_URL or not settings.SONARR_API_KEY:
        return AddToLibraryResponse(
            success=False,
            message="Sonarr not configured.",
        )

    connector = get_sonarr_connector()
    if not connector:
        return AddToLibraryResponse(
            success=False,
            message="Failed to create Sonarr connector.",
        )

    try:
        # Check if series exists
        exists = await connector.check_series_exists_by_title(request.title)
        if exists:
            return AddToLibraryResponse(
                success=True,
                message=f"Series '{request.title}' already exists in Sonarr.",
                item_id=None,
            )

        # Search for series
        results = await connector.search_series(request.title)
        if not results:
            return AddToLibraryResponse(
                success=False,
                message=f"Series '{request.title}' not found.",
            )

        # Get first result
        series = results[0]
        tvdb_id = series.get("tvdbId")

        if not tvdb_id:
            return AddToLibraryResponse(
                success=False,
                message="Could not find TVDB ID for series.",
            )

        # Add series
        added = await connector.add_series(
            title=series.get("title", request.title),
            tvdb_id=tvdb_id,


        )

        return AddToLibraryResponse(
            success=True,
            message=f"Series '{series.get('title')}' added to Sonarr.",
            item_id=added.get("id"),
        )
    finally:
        await connector.close()


async def add_to_radarr(request: AddToLibraryRequest) -> AddToLibraryResponse:
    """Add a movie to Radarr."""
    if not settings.RADARR_URL or not settings.RADARR_API_KEY:
        return AddToLibraryResponse(
            success=False,
            message="Radarr not configured.",
        )

    connector = get_radarr_connector()
    if not connector:
        return AddToLibraryResponse(
            success=False,
            message="Failed to create Radarr connector.",
        )

    try:
        # Check if movie exists
        exists = await connector.check_movie_exists_by_title(request.title)
        if exists:
            return AddToLibraryResponse(
                success=True,
                message=f"Movie '{request.title}' already exists in Radarr.",
                item_id=None,
            )

        # Search for movie
        results = await connector.search_movies(request.title)
        if not results:
            return AddToLibraryResponse(
                success=False,
                message=f"Movie '{request.title}' not found.",
            )

        # Get first result
        movie = results[0]
        tmdb_id = movie.get("tmdbId")

        if not tmdb_id:
            return AddToLibraryResponse(
                success=False,
                message="Could not find TMDB ID for movie.",
            )

        # Add movie
        added = await connector.add_movie(
            title=movie.get("title", request.title),
            tmdb_id=tmdb_id,


        )

        return AddToLibraryResponse(
            success=True,
            message=f"Movie '{movie.get('title')}' added to Radarr.",
            item_id=added.get("id"),
        )
    finally:
        await connector.close()
