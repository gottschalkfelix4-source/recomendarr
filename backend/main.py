"""Main FastAPI application."""
import os
import sys

# Add the current directory to the path so we can import from connectors, routes, etc.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import settings
from db import db
from routes import settings as settings_routes
from routes import history as history_routes
from routes import recommendations as recommendations_routes
from routes import autorun as autorun_routes

app = FastAPI(
    title="Recomendarr Web",
    description="Plex Watch History Analyzer with AI Recommendations",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(settings_routes.router)
app.include_router(history_routes.router)
app.include_router(recommendations_routes.router)
app.include_router(autorun_routes.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and scheduler on startup."""
    db.create_tables()
    from autorun import setup_scheduler
    setup_scheduler()


@app.get("/")
async def read_root():
    """Root endpoint - serve frontend if available."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dist = os.path.join(script_dir, "frontend", "dist")
    if os.path.exists(frontend_dist):
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    return {"message": "Welcome to Recomendarr Web"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "tautulli_configured": bool(settings.TAUTULLI_URL and settings.TAUTULLI_API_KEY),
        "sonarr_configured": bool(settings.SONARR_URL and settings.SONARR_API_KEY),
        "radarr_configured": bool(settings.RADARR_URL and settings.RADARR_API_KEY),
        "ai_configured": bool(settings.AI_BASE_URL and settings.AI_API_KEY),
    }


@app.get("/assets/{path:path}")
async def serve_static_assets(path: str):
    """Serve static assets from frontend."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    asset_path = os.path.join(script_dir, "frontend", "dist", "assets", path)
    if os.path.exists(asset_path):
        return FileResponse(asset_path)
    return {"error": "File not found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
