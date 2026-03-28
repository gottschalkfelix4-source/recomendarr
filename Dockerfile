# Build frontend first
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend runtime
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN adduser --disabled-password --home /app appuser

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/. ./

# Copy frontend build from previous stage
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Create data directory for database
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data
VOLUME /app/data

# Change ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
