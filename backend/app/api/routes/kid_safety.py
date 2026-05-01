"""Kid safety detection routes."""

from fastapi import APIRouter

from app.services.drowsiness_service import get_frame
from app.services.kid_service import detect_kid, get_state

router = APIRouter(tags=["kid-safety"])


@router.get("/kid-safety")
def read_kid_safety_state() -> dict:
	frame = get_frame()
	# If service state indicates disabled, return clear disabled response
	state = get_state()
	if state is None or state.get("status") == "disabled":
		return {"status": "disabled", "message": "Kid detection not available on this server"}

	if frame is None:
		return state

	result = detect_kid(frame, user_id="system", image_name="camera_frame.jpg")
	if result is None or result.get("status") == "disabled":
		return {"status": "disabled", "message": "Kid detection not available on this server"}
	return result
