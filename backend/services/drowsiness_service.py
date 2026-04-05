"""Drowsiness and yawn detection service (webcam background thread)."""

import threading
import time
import math
from pathlib import Path
from urllib.request import urlopen
from typing import Optional

from backend.config import (
    EYE_AR_THRESH, EYE_AR_CONSEC_FRAMES, YAWN_THRESH, MODELS_DIR,
)
from backend.database.mongo import log_alert, log_drowsiness_event
from backend.services.audio_alert_service import trigger_alert
from backend.utils.logger import get_logger

logger = get_logger("drowsiness_service")

_FACE_LANDMARKER_MODEL = MODELS_DIR / "face_landmarker.task"
_FACE_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/latest/face_landmarker.task"
)


def _ensure_face_landmarker_model() -> Optional[Path]:
    if _FACE_LANDMARKER_MODEL.is_file():
        return _FACE_LANDMARKER_MODEL

    try:
        _FACE_LANDMARKER_MODEL.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading face landmarker model to %s", _FACE_LANDMARKER_MODEL)
        with urlopen(_FACE_LANDMARKER_URL, timeout=20) as response:
            content = response.read()
        _FACE_LANDMARKER_MODEL.write_bytes(content)
        logger.info("Face landmarker model downloaded")
        return _FACE_LANDMARKER_MODEL
    except Exception as exc:
        logger.error("Failed to prepare face landmarker model: %s", exc)
        return None

# ── Thread-safe shared state ─────────────────────────────────────────
_lock = threading.Lock()
_state: dict = {
    "active": False,
    "drowsy": False,
    "yawning": False,
    "ear": 0.0,
    "counter": 0,
    "timestamp": 0,
}
_latest_frame_jpeg: Optional[bytes] = None
_running = False
_last_event_log_ts = 0.0


# ── Core EAR calculation — identical to original ─────────────────────
def eye_aspect_ratio(eye):
    def _euclidean(p1, p2):
        return math.hypot((p1[0] - p2[0]), (p1[1] - p2[1]))

    A = _euclidean(eye[1], eye[5])
    B = _euclidean(eye[2], eye[4])
    C = _euclidean(eye[0], eye[3])
    if C <= 1e-6:
        return 0.0
    return (A + B) / (2.0 * C)


# ── Background detection loop ───────────────────────────────────────
def _detection_loop():
    global _state, _latest_frame_jpeg, _running
    global _last_event_log_ts

    try:
        import cv2
        import mediapipe as mp
    except Exception as exc:
        logger.error(f"CV dependencies unavailable, drowsiness service disabled: {exc}")
        with _lock:
            _state["active"] = False
        return

    model_path = _ensure_face_landmarker_model()
    if model_path is None:
        with _lock:
            _state["active"] = False
        return

    BaseOptions = mp.tasks.BaseOptions
    FaceLandmarker = mp.tasks.vision.FaceLandmarker
    FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=VisionRunningMode.VIDEO,
        num_faces=1,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )
    face_landmarker = FaceLandmarker.create_from_options(options)
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        logger.error("Cannot open webcam — drowsiness detection disabled")
        with _lock:
            _state["active"] = False
        face_landmarker.close()
        return

    counter = 0
    prev_drowsy = False
    prev_yawning = False
    with _lock:
        _state["active"] = True
    logger.info("Webcam opened — drowsiness detection running")

    frame_ts = 0

    try:
        while _running:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            frame = cv2.resize(frame, (640, 480))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            frame_ts += 33
            results = face_landmarker.detect_for_video(mp_image, frame_ts)

            drowsy = False
            yawning = False
            ear_val = 0.0

            if results.face_landmarks:
                for landmarks in results.face_landmarks:
                    h, w, _ = frame.shape

                    # Eye landmarks — same indices as original
                    left_eye_idx = [33, 160, 158, 133, 153, 144]
                    right_eye_idx = [362, 385, 387, 263, 373, 380]

                    left_eye = [
                        (int(landmarks[i].x * w), int(landmarks[i].y * h))
                        for i in left_eye_idx
                    ]
                    right_eye = [
                        (int(landmarks[i].x * w), int(landmarks[i].y * h))
                        for i in right_eye_idx
                    ]

                    ear_val = (eye_aspect_ratio(left_eye) +
                               eye_aspect_ratio(right_eye)) / 2.0

                    if ear_val < EYE_AR_THRESH:
                        counter += 1
                        if counter >= EYE_AR_CONSEC_FRAMES:
                            drowsy = True
                    else:
                        counter = 0

                    # Yawn check — same logic as original
                    top = landmarks[13]
                    bottom = landmarks[14]
                    distance = abs((top.y - bottom.y) * h)
                    if distance > YAWN_THRESH:
                        yawning = True

            _, jpeg = cv2.imencode(".jpg", frame)

            with _lock:
                _state.update({
                    "active": True,
                    "drowsy": drowsy,
                    "yawning": yawning,
                    "ear": round(ear_val, 4),
                    "counter": counter,
                    "timestamp": time.time(),
                })
                _latest_frame_jpeg = jpeg.tobytes()

            now = time.time()
            if drowsy or yawning:
                if now - _last_event_log_ts >= 5:
                    log_drowsiness_event(ear_score=ear_val, yawning_detected=yawning)
                    _last_event_log_ts = now

                # Trigger only on state transition to avoid replay every frame.
                if drowsy and not prev_drowsy:
                    log_alert(user_id="system", alert_type="drowsiness", severity="high")
                    trigger_alert("drowsiness", cooldown_seconds=4.0)

                if yawning and not prev_yawning:
                    log_alert(user_id="system", alert_type="yawning", severity="medium")
                    trigger_alert("yawning", cooldown_seconds=4.0)

            prev_drowsy = drowsy
            prev_yawning = yawning

            time.sleep(0.03)  # ~30 FPS cap
    except Exception as e:
        logger.error(f"Detection loop error: {e}")
    finally:
        cap.release()
        face_landmarker.close()
        with _lock:
            _state["active"] = False
        logger.info("Webcam released — detection stopped")


# ── Public API ───────────────────────────────────────────────────────
def start():
    """Start the background detection thread."""
    global _running
    _running = True
    thread = threading.Thread(target=_detection_loop, daemon=True)
    thread.start()
    logger.info("Drowsiness detection thread started")


def stop():
    """Signal the detection loop to stop."""
    global _running
    _running = False
    logger.info("Drowsiness detection stopping…")


def get_state() -> dict:
    """Return a snapshot of the current detection state."""
    with _lock:
        return _state.copy()


def get_frame() -> Optional[bytes]:
    """Return the latest webcam frame as JPEG bytes."""
    with _lock:
        return _latest_frame_jpeg
