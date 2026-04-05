"""
Central Configuration — Single source of truth for all settings.
"""
import os
import sys
from pathlib import Path


def _first_existing_path(*paths: Path) -> Path:
	for candidate in paths:
		if candidate.is_file():
			return candidate
	return paths[0]


def _find_emotion_assets_dir() -> Path:
	env_path = os.getenv("EMOTION_ASSETS_DIR")
	if env_path:
		return Path(env_path)

	default_dir = BASE_DIR.parent / "Emotion detection 12.13.53 AM"

	if default_dir.is_dir():
		return default_dir

	# Handle copy/paste variations in spacing around the timestamp segment.
	for candidate in BASE_DIR.parent.glob("Emotion detection 12.13.53*AM"):
		if candidate.is_dir():
			return candidate

	if MODELS_DIR.is_dir():
		return MODELS_DIR

	return default_dir


def _resolve_drowsiness_service_setting() -> tuple[bool, str]:
	raw_value = os.getenv("ENABLE_DROWSINESS_SERVICE", "auto").strip().lower()
	if raw_value == "false":
		return False, "disabled by ENABLE_DROWSINESS_SERVICE=false"
	if raw_value in {"auto", "true"}:
		return True, ""
	return True, ""

# ── Project Paths ────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
MODELS_DIR = BACKEND_DIR / "models"
FRONTEND_DIR = BASE_DIR / "frontend"
STATIC_DIR = BASE_DIR / "static"
SOUNDS_DIR = BASE_DIR / "Drowsiness_and_Yawning_Detection"

# ── Server ───────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# ── Fog Detection Model ─────────────────────────────────────────────
_fog_model_env = os.getenv("FOG_MODEL_PATH")
if _fog_model_env:
	_fog_model_path = Path(_fog_model_env)
else:
	_fog_model_path = _first_existing_path(
		MODELS_DIR / "fog_model.pth",
		BASE_DIR / "fog_detection" / "fog_model.pth",
	)
FOG_MODEL_PATH = str(_fog_model_path)
FOG_MODEL_CLASSES = 2

# ── Emotion Detection Model ─────────────────────────────────────────
EMOTION_ASSETS_DIR = _find_emotion_assets_dir()
EMOTION_MODEL_PATH = str(EMOTION_ASSETS_DIR / "emotion_detection_model.pkl")
EMOTION_LABEL_ENCODER_PATH = str(EMOTION_ASSETS_DIR / "label_encoder.pkl")
EMOTION_CLASS_NAMES_PATH = str(EMOTION_ASSETS_DIR / "class_names.pkl")
EMOTION_INPUT_SIZE = int(os.getenv("EMOTION_INPUT_SIZE", 64))
EMOTION_ALERT_COOLDOWN_SECONDS = float(os.getenv("EMOTION_ALERT_COOLDOWN_SECONDS", 10.0))

# ── Drowsiness Detection Thresholds ─────────────────────────────────
EYE_AR_THRESH = float(os.getenv("EYE_AR_THRESH", 0.25))
EYE_AR_CONSEC_FRAMES = int(os.getenv("EYE_AR_CONSEC_FRAMES", 20))
YAWN_THRESH = float(os.getenv("YAWN_THRESH", 25))
YAWN_CONSEC_FRAMES = int(os.getenv("YAWN_CONSEC_FRAMES", 8))

# ── Audio Alerts ─────────────────────────────────────────────────────────
AUDIO_ALERTS_ENABLED = os.getenv("ENABLE_AUDIO_ALERTS", "true").lower() == "true"
AUDIO_ALERT_DROWSY_PATH = Path(
	os.getenv(
		"AUDIO_ALERT_DROWSY_PATH",
		str(SOUNDS_DIR / "alert.wav"),
	)
)
AUDIO_ALERT_YAWN_PATH = Path(
	os.getenv(
		"AUDIO_ALERT_YAWN_PATH",
		str(SOUNDS_DIR / "alert2.wav"),
	)
)

# ── Risk Engine Weights ─────────────────────────────────────────────
DROWSINESS_WEIGHT = float(os.getenv("DROWSINESS_WEIGHT", 0.6))
FOG_WEIGHT = float(os.getenv("FOG_WEIGHT", 0.4))
STRESS_WEIGHT = float(os.getenv("STRESS_WEIGHT", 0.2))
VISIBILITY_WEIGHT = float(os.getenv("VISIBILITY_WEIGHT", 0.1))
CHILD_WEIGHT = float(os.getenv("CHILD_WEIGHT", 0.1))
EMOTION_WEIGHT = float(os.getenv("EMOTION_WEIGHT", 0.35))
EMOTION_HIGH_RISK_WEIGHT = float(os.getenv("EMOTION_HIGH_RISK_WEIGHT", 8.0))
EMOTION_MEDIUM_RISK_WEIGHT = float(os.getenv("EMOTION_MEDIUM_RISK_WEIGHT", 4.0))
EMOTION_LOW_RISK_WEIGHT = float(os.getenv("EMOTION_LOW_RISK_WEIGHT", 1.0))

# ── Polling / Push Intervals (seconds) ──────────────────────────────
DROWSINESS_POLL_INTERVAL = 0.5
FOG_POLL_INTERVAL = 5.0
WEBSOCKET_PUSH_INTERVAL = 1.0

# ── CORS ─────────────────────────────────────────────────────────────
CORS_ORIGINS = ["*"]

# ── Logging ──────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ALERT_LOG_LEVEL = os.getenv("ALERT_LOG_LEVEL", LOG_LEVEL)

# ── Database ────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "driver_safety")

# ── Auth / JWT ──────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-jwt-secret-key-min-32-chars")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", 480))  # 8 hours

# ── API Rate Limiting ───────────────────────────────────────────────
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", 120))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))

# ── OTP / Password Reset ────────────────────────────────────────────
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", 5))

# ── SMTP (optional — used for OTP emails) ───────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@driversafety.ai")

# ── Runtime Mode ────────────────────────────────────────────────────
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"
ENABLE_DROWSINESS_SERVICE, DROWSINESS_SERVICE_DISABLED_REASON = _resolve_drowsiness_service_setting()
