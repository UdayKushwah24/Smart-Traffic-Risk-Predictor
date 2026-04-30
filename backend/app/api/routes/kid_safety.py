"""Kid safety detection routes."""

from fastapi import APIRouter

from app.services.drowsiness_service import get_frame
from app.services.kid_service import detect_kid, get_state

router = APIRouter(tags=["kid-safety"])


@router.get("/kid-safety")
def read_kid_safety_state() -> dict:
	frame = get_frame()
	if frame is None:
		return get_state()
	return detect_kid(frame, user_id="system", image_name="camera_frame.jpg")
