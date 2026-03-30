"""Auto-run engine: scheduled recommendation generation + library additions."""
import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from db import db
from connectors.tautulli import TautulliConnector
from connectors.plex import PlexConnector
from connectors.ai import AIConnector
from connectors.sonarr import get_sonarr_connector
from connectors.radarr import get_radarr_connector

logger = logging.getLogger("autorun")

scheduler: Optional[AsyncIOScheduler] = None
_is_running = False

# Live log buffer (ring buffer, max 200 entries)
_live_log: list[dict] = []
_live_log_max = 200


def _log(message: str, level: str = "info"):
    """Add a live log entry."""
    entry = {"time": datetime.now().isoformat(), "level": level, "message": message}
    _live_log.append(entry)
    if len(_live_log) > _live_log_max:
        _live_log.pop(0)
    if level == "error":
        logger.error(message)
    else:
        logger.info(message)


def get_live_log(since_index: int = 0) -> tuple[list[dict], int]:
    """Get live log entries since index. Returns (entries, next_index)."""
    entries = _live_log[since_index:]
    return entries, len(_live_log)


def clear_live_log():
    """Clear the live log buffer."""
    _live_log.clear()


def get_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


def setup_scheduler():
    """Initialize the scheduler and add the autorun job if enabled."""
    global _is_running
    # Clean up stale "running" logs from previous container runs
    _is_running = False
    _cleanup_stale_runs()
    sched = get_scheduler()
    if not sched.running:
        sched.start()
    update_schedule()


def _cleanup_stale_runs():
    """Mark any 'running' logs as failed (from previous container crash/restart)."""
    try:
        with db.get_session() as session:
            from db import AutoRunLog
            stale = session.query(AutoRunLog).filter(AutoRunLog.status == "running").all()
            for log in stale:
                log.status = "failed"
                log.error_message = "Interrupted (container restart)"
                log.finished_at = datetime.now()
            if stale:
                session.commit()
                logger.info(f"Cleaned up {len(stale)} stale run log(s)")
    except Exception as e:
        logger.error(f"Failed to clean up stale runs: {e}")


def update_schedule():
    """Update the scheduled job based on current settings."""
    sched = get_scheduler()
    job_id = "autorun_recommendations"

    # Remove existing job
    if sched.get_job(job_id):
        sched.remove_job(job_id)

    if settings.AUTORUN_ENABLED:
        hours = settings.AUTORUN_INTERVAL_HOURS
        sched.add_job(
            run_autorun,
            trigger=IntervalTrigger(hours=hours),
            id=job_id,
            name="Auto-run recommendations",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(f"Autorun scheduled every {hours}h")
    else:
        logger.info("Autorun disabled")


def get_status() -> dict:
    """Get current autorun status."""
    sched = get_scheduler()
    job = sched.get_job("autorun_recommendations")
    next_run = None
    if job and job.next_run_time:
        next_run = job.next_run_time.isoformat()

    latest = db.get_latest_run()

    return {
        "enabled": settings.AUTORUN_ENABLED,
        "is_running": _is_running,
        "interval_hours": settings.AUTORUN_INTERVAL_HOURS,
        "max_movies": settings.AUTORUN_MAX_MOVIES,
        "max_series": settings.AUTORUN_MAX_SERIES,
        "min_rating": settings.AUTORUN_MIN_RATING,
        "users": settings.AUTORUN_USERS,
        "next_run": next_run,
        "last_run": latest,
    }


async def _get_users() -> list[str]:
    """Get list of users to process."""
    configured = settings.AUTORUN_USERS
    if configured and configured != "all":
        return [u.strip() for u in configured.split(",") if u.strip()]

    # Fetch all users from configured source
    source = settings.HISTORY_SOURCE
    users = []

    if source in ("tautulli", "both") and settings.TAUTULLI_URL:
        connector = TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
        try:
            activity = await connector.get_users_activity()
            users.extend([u.user for u in activity])
        finally:
            await connector.close()

    if source in ("plex", "both") and settings.PLEX_URL:
        connector = PlexConnector(settings.PLEX_URL, settings.PLEX_TOKEN)
        try:
            plex_users = await connector.get_users()
            existing = {u.lower() for u in users}
            users.extend([u.user for u in plex_users if u.user.lower() not in existing])
        finally:
            await connector.close()

    return users


async def _get_history(username: str) -> list[dict]:
    """Get watch history for a user."""
    source = settings.HISTORY_SOURCE
    history = []

    if source in ("tautulli", "both") and settings.TAUTULLI_URL:
        connector = TautulliConnector(settings.TAUTULLI_URL, settings.TAUTULLI_API_KEY)
        try:
            h = await connector.get_watch_history(username=username, length=settings.AI_HISTORY_DEPTH)
            history.extend(h)
        finally:
            await connector.close()

    if source in ("plex", "both") and settings.PLEX_URL:
        connector = PlexConnector(settings.PLEX_URL, settings.PLEX_TOKEN)
        try:
            h = await connector.get_watch_history(username=username, length=settings.AI_HISTORY_DEPTH)
            history.extend(h)
        finally:
            await connector.close()

    return [h.model_dump() for h in history]


async def _add_to_sonarr(title: str) -> dict:
    """Try to add a series to Sonarr. Returns result dict."""
    connector = get_sonarr_connector()
    if not connector:
        return {"success": False, "message": "Sonarr not configured"}
    try:
        exists = await connector.check_series_exists_by_title(title)
        if exists:
            return {"success": False, "message": "Already in Sonarr", "skipped": True}
        results = await connector.search_series(title)
        if not results:
            return {"success": False, "message": "Not found on Sonarr"}
        series = results[0]
        tvdb_id = series.get("tvdbId")
        if not tvdb_id:
            return {"success": False, "message": "No TVDB ID"}
        await connector.add_series(title=series.get("title", title), tvdb_id=tvdb_id)
        return {"success": True, "message": f"Added '{series.get('title')}'"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        await connector.close()


async def _add_to_radarr(title: str) -> dict:
    """Try to add a movie to Radarr. Returns result dict."""
    connector = get_radarr_connector()
    if not connector:
        return {"success": False, "message": "Radarr not configured"}
    try:
        exists = await connector.check_movie_exists_by_title(title)
        if exists:
            return {"success": False, "message": "Already in Radarr", "skipped": True}
        results = await connector.search_movies(title)
        if not results:
            return {"success": False, "message": "Not found on Radarr"}
        movie = results[0]
        tmdb_id = movie.get("tmdbId")
        if not tmdb_id:
            return {"success": False, "message": "No TMDB ID"}
        await connector.add_movie(title=movie.get("title", title), tmdb_id=tmdb_id)
        return {"success": True, "message": f"Added '{movie.get('title')}'"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        await connector.close()


async def run_autorun():
    """Execute one full auto-run cycle."""
    global _is_running
    if _is_running:
        _log("Autorun already in progress, skipping", "warn")
        return
    _is_running = True
    clear_live_log()
    log_id = db.add_run_log(user="all")

    total_movies_added = 0
    total_series_added = 0
    total_movies_skipped = 0
    total_series_skipped = 0
    all_details = []

    try:
        _log("Starting auto-run cycle...")
        _log("Fetching user list...")
        users = await _get_users()
        if not users:
            _log("No users found — aborting", "error")
            db.update_run_log(log_id, status="failed", finished_at=datetime.now(),
                              error_message="No users found")
            return

        _log(f"Found {len(users)} user(s): {', '.join(users)}")

        max_movies = settings.AUTORUN_MAX_MOVIES
        max_series = settings.AUTORUN_MAX_SERIES
        min_rating = settings.AUTORUN_MIN_RATING
        _log(f"Config: max {max_movies} movies, {max_series} series per user, min rating {min_rating}")

        for idx, user in enumerate(users):
            user_detail = {"user": user, "added": [], "skipped": [], "errors": []}
            _log(f"[{idx+1}/{len(users)}] Processing user: {user}")

            try:
                # Get history
                _log(f"  Fetching watch history for {user}...")
                history = await _get_history(user)
                if not history:
                    _log(f"  No watch history for {user} — skipping", "warn")
                    user_detail["errors"].append("No watch history")
                    all_details.append(user_detail)
                    continue
                _log(f"  Found {len(history)} history entries")

                # Generate recommendations
                _log(f"  Sending to AI ({settings.AI_MODEL})... this may take a moment")
                ai = AIConnector(
                    settings.AI_BASE_URL, settings.AI_API_KEY,
                    settings.AI_MODEL, settings.AUTORUN_TEMPERATURE,
                )
                try:
                    result = await ai.analyze_watch_history(
                        history,
                        num_movies=max_movies + 3,
                        num_series=max_series + 3,
                        max_titles=settings.AI_MAX_TITLES,
                        custom_prompt=settings.AI_CUSTOM_PROMPT,
                    )
                finally:
                    await ai.close()

                recs = result.get("recommendations", [])
                _log(f"  AI returned {len(recs)} recommendations")

                # Filter by min rating
                before_filter = len(recs)
                recs = [r for r in recs if r.get("rating", 0) >= min_rating]
                if len(recs) < before_filter:
                    _log(f"  Filtered to {len(recs)} (dropped {before_filter - len(recs)} below {min_rating} rating)")

                # Log what AI recommended
                for r in recs:
                    _log(f"  >> {r.get('title')} ({r.get('media_type')}) — rating {r.get('rating', '?')}")

                movies_added_this_user = 0
                series_added_this_user = 0

                for rec in recs:
                    title = rec.get("title", "")
                    media_type = rec.get("media_type", "")

                    if media_type == "movie" and movies_added_this_user < max_movies:
                        _log(f"  Adding movie to Radarr: {title}")
                        result = await _add_to_radarr(title)
                        if result.get("success"):
                            movies_added_this_user += 1
                            total_movies_added += 1
                            user_detail["added"].append(f"Movie: {title}")
                            _log(f"    + Added to Radarr")
                        elif result.get("skipped"):
                            total_movies_skipped += 1
                            user_detail["skipped"].append(f"Movie: {title}")
                            _log(f"    ~ Already in Radarr — skipped")
                        else:
                            user_detail["errors"].append(f"Movie '{title}': {result.get('message')}")
                            _log(f"    ! Failed: {result.get('message')}", "error")

                    elif media_type == "series" and series_added_this_user < max_series:
                        _log(f"  Adding series to Sonarr: {title}")
                        result = await _add_to_sonarr(title)
                        if result.get("success"):
                            series_added_this_user += 1
                            total_series_added += 1
                            user_detail["added"].append(f"Series: {title}")
                            _log(f"    + Added to Sonarr")
                        elif result.get("skipped"):
                            total_series_skipped += 1
                            user_detail["skipped"].append(f"Series: {title}")
                            _log(f"    ~ Already in Sonarr — skipped")
                        else:
                            user_detail["errors"].append(f"Series '{title}': {result.get('message')}")
                            _log(f"    ! Failed: {result.get('message')}", "error")

                _log(f"  Done with {user}: +{movies_added_this_user} movies, +{series_added_this_user} series")

            except Exception as e:
                user_detail["errors"].append(str(e))
                _log(f"  Error processing {user}: {e}", "error")

            all_details.append(user_detail)

        _log(f"Auto-run complete: +{total_movies_added} movies, +{total_series_added} series, {total_movies_skipped + total_series_skipped} skipped")
        db.update_run_log(
            log_id,
            status="success",
            finished_at=datetime.now(),
            movies_added=total_movies_added,
            series_added=total_series_added,
            movies_skipped=total_movies_skipped,
            series_skipped=total_series_skipped,
            details=json.dumps(all_details),
        )

    except Exception as e:
        _log(f"Auto-run failed: {e}", "error")
        db.update_run_log(log_id, status="failed", finished_at=datetime.now(), error_message=str(e))
    finally:
        _is_running = False
