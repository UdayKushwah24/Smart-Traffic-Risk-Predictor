"""Application settings and runtime constants."""

from __future__ import annotations

from pathlib import Path

try:
	from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:  # pragma: no cover - compatibility fallback
	from pydantic import BaseSettings  # type: ignore
	SettingsConfigDict = dict  # type: ignore


BASE_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = BASE_DIR / "backend"
MODELS_DIR = BACKEND_DIR / "models"
FRONTEND_DIR = BASE_DIR / "frontend"
STATIC_DIR = BASE_DIR / "static"
SOUNDS_DIR = BASE_DIR / "Drowsiness_and_Yawning_Detection"


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		env_file=str(BASE_DIR / ".env"),
		env_file_encoding="utf-8",
		extra="ignore",
	)

	host: str = "0.0.0.0"
	port: int = 8000
	cors_origins: str = "*"
	log_level: str = "INFO"
	alert_log_level: str = "INFO"
	mongo_uri: str = "mongodb://localhost:27017"
	mongo_db_name: str = "driver_safety"
	jwt_secret_key: str = "change-this-jwt-secret-key-min-32-chars"
	jwt_algorithm: str = "HS256"
	jwt_exp_minutes: int = 480
	rate_limit_requests: int = 120
	rate_limit_window_seconds: int = 60
	otp_expiry_minutes: int = 5
	smtp_host: str = ""
	smtp_port: int = 587
	smtp_user: str = ""
	smtp_pass: str = ""
	smtp_from: str = "noreply@driversafety.ai"
	test_mode: bool = False
	enable_audio_alerts: bool = True
	enable_drowsiness_service: str = "auto"
	fog_model_path: str | None = None
	emotion_assets_dir: str | None = None
	emotion_input_size: int = 64
	emotion_alert_cooldown_seconds: float = 10.0
	eye_ar_thresh: float = 0.25
	eye_ar_consec_frames: int = 20
	yawn_thresh: float = 25.0
	yawn_consec_frames: int = 8
	head_pose_yaw_thresh: float = 0.10
	head_pose_pitch_thresh: float = 0.08
	head_pose_alert_seconds: float = 5.0
	head_pose_return_ratio: float = 0.7
	yawn_open_ratio: float = 0.34
	yawn_close_ratio: float = 0.29
	yawn_min_duration_seconds: float = 1.2
	yawn_min_consec_frames: int = 5
	box_smooth_alpha: float = 0.35
	metric_smooth_alpha: float = 0.35
	audio_alerts_enabled: bool = True
	audio_alert_drowsy_path: str | None = None
	audio_alert_yawn_path: str | None = None
	drowsiness_weight: float = 0.6
	fog_weight: float = 0.4
	stress_weight: float = 0.2
	visibility_weight: float = 0.1
	child_weight: float = 0.1
	kid_safety_weight: float = 0.3
	emotion_weight: float = 0.35
	emotion_high_risk_weight: float = 8.0
	emotion_medium_risk_weight: float = 4.0
	emotion_low_risk_weight: float = 1.0


settings = Settings()


def _first_existing_path(*paths: Path) -> Path:
	for candidate in paths:
		if candidate.is_file():
			return candidate
	return paths[0]


def _find_emotion_assets_dir() -> Path:
	if settings.emotion_assets_dir:
		return Path(settings.emotion_assets_dir)

	default_dir = BASE_DIR.parent / "Emotion detection 12.13.53 AM"
	if default_dir.is_dir():
		return default_dir

	for candidate in BASE_DIR.parent.glob("Emotion detection 12.13.53*AM"):
		if candidate.is_dir():
			return candidate

	if MODELS_DIR.is_dir():
		return MODELS_DIR

	return default_dir


def _resolve_drowsiness_service_setting() -> tuple[bool, str]:
	raw_value = settings.enable_drowsiness_service.strip().lower()
	if raw_value == "false":
		return False, "disabled by ENABLE_DROWSINESS_SERVICE=false"
	if raw_value in {"true", "auto"}:
		return True, ""
	return True, ""


HOST = settings.host
PORT = settings.port
CORS_ORIGINS = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()] or ["*"]
LOG_LEVEL = settings.log_level
ALERT_LOG_LEVEL = settings.alert_log_level or settings.log_level
MONGO_URI = settings.mongo_uri
MONGO_DB_NAME = settings.mongo_db_name
JWT_SECRET_KEY = settings.jwt_secret_key
JWT_ALGORITHM = settings.jwt_algorithm
JWT_EXP_MINUTES = settings.jwt_exp_minutes
RATE_LIMIT_REQUESTS = settings.rate_limit_requests
RATE_LIMIT_WINDOW_SECONDS = settings.rate_limit_window_seconds
OTP_EXPIRY_MINUTES = settings.otp_expiry_minutes
SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USER = settings.smtp_user
SMTP_PASS = settings.smtp_pass
SMTP_FROM = settings.smtp_from
TEST_MODE = settings.test_mode
ENABLE_AUDIO_ALERTS = settings.enable_audio_alerts
FOG_MODEL_CLASSES = 2

_fog_model_path = Path(settings.fog_model_path) if settings.fog_model_path else _first_existing_path(
	MODELS_DIR / "fog_model.pth",
	BASE_DIR / "fog_detection" / "fog_model.pth",
)
FOG_MODEL_PATH = str(_fog_model_path)

EMOTION_ASSETS_DIR = _find_emotion_assets_dir()
EMOTION_MODEL_PATH = str(EMOTION_ASSETS_DIR / "emotion_detection_model.pkl")
EMOTION_LABEL_ENCODER_PATH = str(EMOTION_ASSETS_DIR / "label_encoder.pkl")
EMOTION_CLASS_NAMES_PATH = str(EMOTION_ASSETS_DIR / "class_names.pkl")
EMOTION_INPUT_SIZE = settings.emotion_input_size
EMOTION_ALERT_COOLDOWN_SECONDS = settings.emotion_alert_cooldown_seconds

EYE_AR_THRESH = settings.eye_ar_thresh
EYE_AR_CONSEC_FRAMES = settings.eye_ar_consec_frames
YAWN_THRESH = settings.yawn_thresh
YAWN_CONSEC_FRAMES = settings.yawn_consec_frames
HEAD_POSE_YAW_THRESH = settings.head_pose_yaw_thresh
HEAD_POSE_PITCH_THRESH = settings.head_pose_pitch_thresh
HEAD_POSE_ALERT_SECONDS = settings.head_pose_alert_seconds
HEAD_POSE_RETURN_RATIO = settings.head_pose_return_ratio
YAWN_OPEN_RATIO = settings.yawn_open_ratio
YAWN_CLOSE_RATIO = settings.yawn_close_ratio
YAWN_MIN_DURATION_SECONDS = settings.yawn_min_duration_seconds
YAWN_MIN_CONSEC_FRAMES = settings.yawn_min_consec_frames
BOX_SMOOTH_ALPHA = settings.box_smooth_alpha
METRIC_SMOOTH_ALPHA = settings.metric_smooth_alpha

AUDIO_ALERTS_ENABLED = settings.audio_alerts_enabled
AUDIO_ALERT_DROWSY_PATH = Path(settings.audio_alert_drowsy_path or str(SOUNDS_DIR / "alert.wav"))
AUDIO_ALERT_YAWN_PATH = Path(settings.audio_alert_yawn_path or str(SOUNDS_DIR / "alert2.wav"))

DROWSINESS_WEIGHT = settings.drowsiness_weight
FOG_WEIGHT = settings.fog_weight
STRESS_WEIGHT = settings.stress_weight
VISIBILITY_WEIGHT = settings.visibility_weight
CHILD_WEIGHT = settings.child_weight
KID_SAFETY_WEIGHT = settings.kid_safety_weight
EMOTION_WEIGHT = settings.emotion_weight
EMOTION_HIGH_RISK_WEIGHT = settings.emotion_high_risk_weight
EMOTION_MEDIUM_RISK_WEIGHT = settings.emotion_medium_risk_weight
EMOTION_LOW_RISK_WEIGHT = settings.emotion_low_risk_weight

DROWSINESS_POLL_INTERVAL = 0.5
FOG_POLL_INTERVAL = 5.0
KID_SAFETY_POLL_INTERVAL = 1.5
WEBSOCKET_PUSH_INTERVAL = 1.0

ENABLE_DROWSINESS_SERVICE, DROWSINESS_SERVICE_DISABLED_REASON = _resolve_drowsiness_service_setting()
