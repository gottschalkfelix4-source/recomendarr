"""History API routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional

from connectors.tautulli import TautulliConnector
from connectors.plex import PlexConnector
from config import settings

router = APIRouter(prefix="/api/history", tags=["history"])


async def _get_history_from_tautulli(username: Optional[str], limit: int, offset: int):
    """Fetch history from Tautulli."""
    if not settings.TAUTULLI_URL or not settings.TAUTULLI_API_KEY:
        raise HTTPException(status_code=400, detail="Tautulli not configured.")
    connector = TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
    try:
        return await connector.get_watch_history(username=username, start=offset, length=limit)
    finally:
        await connector.close()


async def _get_history_from_plex(username: Optional[str], limit: int, offset: int):
    """Fetch history from Plex directly."""
    if not settings.PLEX_URL or not settings.PLEX_TOKEN:
        raise HTTPException(status_code=400, detail="Plex not configured.")
    connector = PlexConnector(settings.PLEX_URL, settings.PLEX_TOKEN)
    try:
        return await connector.get_watch_history(username=username, start=offset, length=limit)
    finally:
        await connector.close()


async def _get_users_from_tautulli():
    """Fetch users from Tautulli."""
    if not settings.TAUTULLI_URL or not settings.TAUTULLI_API_KEY:
        raise HTTPException(status_code=400, detail="Tautulli not configured.")
    connector = TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
    try:
        return await connector.get_users_activity()
    finally:
        await connector.close()


async def _get_users_from_plex():
    """Fetch users from Plex directly."""
    if not settings.PLEX_URL or not settings.PLEX_TOKEN:
        raise HTTPException(status_code=400, detail="Plex not configured.")
    connector = PlexConnector(settings.PLEX_URL, settings.PLEX_TOKEN)
    try:
        return await connector.get_users()
    finally:
        await connector.close()


@router.get("/", response_model=dict)
async def get_watch_history(
    username: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Get watch history from configured source (Tautulli, Plex, or both)."""
    source = settings.HISTORY_SOURCE

    history = []

    if source in ("tautulli", "both"):
        try:
            history.extend(await _get_history_from_tautulli(username, limit, offset))
        except HTTPException:
            if source == "tautulli":
                raise
            # If "both", silently skip if Tautulli isn't configured

    if source in ("plex", "both"):
        try:
            plex_history = await _get_history_from_plex(username, limit, offset)
            if source == "both":
                # Deduplicate by rating_key + view_date (rough)
                existing_keys = {(h.rating_key, h.view_date.isoformat()[:16]) for h in history}
                for h in plex_history:
                    key = (h.rating_key, h.view_date.isoformat()[:16])
                    if key not in existing_keys:
                        history.append(h)
            else:
                history = plex_history
        except HTTPException:
            if source == "plex":
                raise
            # If "both", silently skip if Plex isn't configured

    # Sort by view_date descending
    history.sort(key=lambda h: h.view_date, reverse=True)

    # Apply limit after merge
    if source == "both":
        history = history[:limit]

    return {
        "success": True,
        "data": [h.model_dump() for h in history],
        "total": len(history),
        "offset": offset,
        "limit": limit,
        "source": source,
    }


@router.get("/users", response_model=dict)
async def get_users_activity():
    """Get users from configured source."""
    source = settings.HISTORY_SOURCE

    users = []
    seen = set()

    if source in ("tautulli", "both"):
        try:
            for u in await _get_users_from_tautulli():
                if u.user.lower() not in seen:
                    seen.add(u.user.lower())
                    users.append(u)
        except HTTPException:
            if source == "tautulli":
                raise

    if source in ("plex", "both"):
        try:
            for u in await _get_users_from_plex():
                if u.user.lower() not in seen:
                    seen.add(u.user.lower())
                    users.append(u)
        except HTTPException:
            if source == "plex":
                raise

    return {
        "success": True,
        "data": [u.model_dump() for u in users],
        "source": source,
    }


@router.get("/users/{username}", response_model=dict)
async def get_user_history(username: str):
    """Get watch history for a specific user."""
    return await get_watch_history(username=username)


@router.post("/sync", response_model=dict)
async def sync_history():
    """Sync watch history from configured source."""
    return await get_watch_history()
