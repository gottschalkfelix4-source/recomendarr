# Recomendarr Web

Plex Watch History Analyzer with AI Recommendations for Sonarr and Radarr.

## Features

- Analyze Plex watch history from Tautulli
- AI-powered recommendations using OpenAI-compatible providers
- Auto-add recommendations to Sonarr (TV series) and Radarr (movies)
- Full web UI for configuration - no .env files needed
- All settings persisted in SQLite database

## Tech Stack

### Backend
- Python 3.10+
- FastAPI
- httpx for async API calls
- Pydantic for data validation
- SQLAlchemy for SQLite database

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand for state management

## Docker Setup (Recommended)

```bash
# Create data directory for persistent storage
mkdir -p data

# Build and start
docker-compose build
docker-compose up -d

# Access at http://localhost:8000
```

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration

All settings are managed through the web UI at `/settings`:

1. **Tautulli** - URL and API key for Plex watch history
2. **Sonarr** - URL and API key for TV series management
3. **Radarr** - URL and API key for movie management
4. **AI Provider** - Base URL and API key (OpenAI-compatible)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | Get current settings |
| POST | /api/settings | Update settings |
| POST | /api/settings/test | Test connection |
| GET | /api/history | Get watch history |
| GET | /api/history/users | Get all users |
| POST | /api/recommendations/generate | Generate recommendations |
| POST | /api/recommendations/add | Add to Sonarr/Radarr |

## Database

Settings are stored in `backend/data/settings.db`. This file persists between container restarts when mounted as a volume.

## License

MIT
