"""
╔══════════════════════════════════════════════════════════════════════╗
║       AI-based Driver Safety & Risk Prediction System               ║
║       Unified Application Server (Single Entry Point)               ║
╚══════════════════════════════════════════════════════════════════════╝

Run with:
    python app.py

This starts the full server stack:
  • Drowsiness detection (webcam, background thread when supported)
  • Fog detection model (loaded once into memory)
  • Risk engine (computes unified score)
  • REST API (all endpoints)
  • WebSocket (real-time push to dashboard)
  • Static file serving (React dashboard build)

Single port: 8000 (configurable via PORT env var)
"""

import sys
import os
import time
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure project root is on sys.path for clean imports
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import (
    HOST,
    PORT,
    CORS_ORIGINS,
    FRONTEND_DIR,
    STATIC_DIR,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
    TEST_MODE,
    ENABLE_DROWSINESS_SERVICE,
    DROWSINESS_SERVICE_DISABLED_REASON,
)
from backend.database.mongo import init_mongo
from backend.services import drowsiness_service, fog_service, accident_service
from backend.routes import api, ws, auth
from backend.emotion_detection.emotion_routes import router as emotion_router
from backend.utils.logger import get_logger

logger = get_logger("app")
_rate_limit_store: dict[str, list[float]] = {}


# ── App Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load models, start detection. Shutdown: stop cleanly."""
    logger.info("=" * 60)
    logger.info("  Driver Safety System — Starting up")
    logger.info("=" * 60)

    init_mongo()

    # Accident model is a simple pkl — always load it regardless of TEST_MODE
    accident_service.load_model()

    if not TEST_MODE:
        fog_service.load_model()
        if ENABLE_DROWSINESS_SERVICE:
            drowsiness_service.start()
        else:
            logger.warning(
                "Drowsiness detection startup skipped: %s",
                DROWSINESS_SERVICE_DISABLED_REASON,
            )
    else:
        logger.info("TEST_MODE enabled: fog model and webcam start skipped")

    logger.info(f"Server running at http://{HOST}:{PORT}")
    logger.info(f"Dashboard:  http://localhost:{PORT}")
    logger.info(f"API docs:   http://localhost:{PORT}/docs")
    logger.info(f"WebSocket:  ws://localhost:{PORT}/ws/risk")
    logger.info("=" * 60)

    yield  # App is running

    # Shutdown
    logger.info("Shutting down…")
    if not TEST_MODE:
        drowsiness_service.stop()
    logger.info("All services stopped.")


# ── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(
    title="AI-Based Driver Safety Risk Prediction System",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path

    if path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    if path.startswith("/ws"):
        return await call_next(request)

    # Apply rate limiting only to API endpoints.
    if not path.startswith("/api"):
        return await call_next(request)

    # Emotion endpoint is polled frequently by the analytics UI.
    # Skipping it here avoids false "analysis unavailable" client errors.
    if path.startswith("/api/emotion-detection"):
        return await call_next(request)

    now = time.time()
    client_ip = request.client.host if request.client else "unknown"
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    requests = [ts for ts in _rate_limit_store.get(client_ip, []) if ts >= window_start]

    if len(requests) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
        )

    requests.append(now)
    _rate_limit_store[client_ip] = requests
    return await call_next(request)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation failed", "details": exc.errors()})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})

# Mount routes
app.include_router(api.router)
app.include_router(auth.router)
app.include_router(ws.router)
app.include_router(emotion_router, prefix="/api")

# Serve static files if build exists
_dist_dir = FRONTEND_DIR / "dist"
if _dist_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")
    logger.info(f"Serving frontend from {_dist_dir}")


# ── Run ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, reload=False)
