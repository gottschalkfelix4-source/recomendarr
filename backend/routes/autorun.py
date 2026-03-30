"""Auto-run API routes."""
import asyncio
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from db import db
from config import settings
from autorun import get_status, run_autorun, update_schedule, get_live_log

router = APIRouter(prefix="/api/autorun", tags=["autorun"])


class AutoRunSettingsRequest(BaseModel):
    enabled: Optional[bool] = None
    interval_hours: Optional[int] = None
    max_movies: Optional[int] = None
    max_series: Optional[int] = None
    min_rating: Optional[float] = None
    temperature: Optional[float] = None
    users: Optional[str] = None


@router.get("/status")
async def autorun_status():
    """Get current autorun status."""
    return get_status()


@router.get("/settings")
async def autorun_settings():
    """Get autorun settings."""
    return {
        "enabled": settings.AUTORUN_ENABLED,
        "interval_hours": settings.AUTORUN_INTERVAL_HOURS,
        "max_movies": settings.AUTORUN_MAX_MOVIES,
        "max_series": settings.AUTORUN_MAX_SERIES,
        "min_rating": settings.AUTORUN_MIN_RATING,
        "temperature": settings.AUTORUN_TEMPERATURE,
        "users": settings.AUTORUN_USERS,
    }


@router.post("/settings")
async def update_autorun_settings(request: AutoRunSettingsRequest):
    """Update autorun settings."""
    if request.enabled is not None:
        db.set_setting("autorun_enabled", "true" if request.enabled else "false")
    if request.interval_hours is not None:
        db.set_setting("autorun_interval_hours", str(max(1, request.interval_hours)))
    if request.max_movies is not None:
        db.set_setting("autorun_max_movies", str(max(0, request.max_movies)))
    if request.max_series is not None:
        db.set_setting("autorun_max_series", str(max(0, request.max_series)))
    if request.min_rating is not None:
        db.set_setting("autorun_min_rating", str(max(0, min(10, request.min_rating))))
    if request.temperature is not None:
        db.set_setting("autorun_temperature", str(max(0, min(1.5, request.temperature))))
    if request.users is not None:
        db.set_setting("autorun_users", request.users)

    # Update the scheduler
    update_schedule()

    return {"success": True, "message": "Settings updated"}


@router.post("/trigger")
async def trigger_autorun(background_tasks: BackgroundTasks):
    """Trigger a manual autorun now."""
    from autorun import _is_running
    if _is_running:
        return {"success": False, "message": "Already running"}

    background_tasks.add_task(run_autorun)
    return {"success": True, "message": "Autorun started"}


@router.get("/logs")
async def get_autorun_logs(limit: int = 20):
    """Get autorun execution logs."""
    logs = db.get_run_logs(limit=limit)
    return {"success": True, "data": logs}


@router.get("/livelog")
async def get_autorun_livelog(since: int = 0):
    """Get live log entries since index (for polling)."""
    entries, next_index = get_live_log(since)
    return {"entries": entries, "next_index": next_index}
