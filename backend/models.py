"""Data models for the recommendation engine."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# Tautulli Models
class WatchHistory(BaseModel):
    id: Optional[int] = None
    username: Optional[str] = None
    title: str
    parent_title: Optional[str] = None
    grandparent_title: Optional[str] = None
    media_type: str
    view_date: datetime
    watched: bool
    duration: int = 0
    rating_key: Optional[str] = None
    parent_rating_key: Optional[str] = None
    grandparent_rating_key: Optional[str] = None


class UserActivity(BaseModel):
    user: str
    total_watched: int
    total_duration: int
    last_activity: datetime
    favorite_genres: List[str]
    watched_titles: List[str]


# Recommendation Models
class Recommendation(BaseModel):
    id: str
    title: str
    media_type: str  # "movie" or "series"
    rating: float
    reason: str
    suggested_by_ai: bool
    added_to_radarr: bool = False
    added_to_sonarr: bool = False
    created_at: datetime = datetime.now()


# API Request/Response Models
class SettingsRequest(BaseModel):
    tautulli_url: str
    tautulli_api_key: str
    sonarr_url: str
    sonarr_api_key: str
    radarr_url: str
    radarr_api_key: str
    plex_url: Optional[str] = None
    plex_token: Optional[str] = None
    ai_base_url: str
    ai_api_key: str
    ai_model: str


class SettingsResponse(BaseModel):
    success: bool
    message: str


class GenerateRecommendationsRequest(BaseModel):
    username: Optional[str] = None  # None = analyze all users
    min_episodes: int = 3
    min_rating: float = 7.0


class AddToLibraryRequest(BaseModel):
    title: str
    media_type: str  # "movie" or "series"
    rating_key: str


class AddToLibraryResponse(BaseModel):
    success: bool
    message: str
    item_id: Optional[int] = None
