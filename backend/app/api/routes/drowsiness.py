"""Drowsiness detection routes."""

from fastapi import APIRouter, Response

from app.services.drowsiness_service import get_frame, get_state

router = APIRouter(tags=["drowsiness"])


@router.get("/drowsiness")
def read_drowsiness_state() -> dict:
	result = get_state()
	if result is None or result.get("status") == "disabled":
		return {"status": "disabled", "message": "Drowsiness detection not available on this server"}
	return result


@router.get("/drowsiness/frame")
def read_drowsiness_frame() -> Response:
	# Prefer returning a clear disabled response if service unavailable
	state = get_state()
	if state is None or state.get("status") == "disabled":
		return Response(status_code=503, media_type="application/json", content='{"status":"disabled","message":"Drowsiness detection not available on this server"}')

	frame = get_frame()
	if frame is None:
		return Response(status_code=503, media_type="application/json", content='{"error":"No frame available"}')
	return Response(content=frame, media_type="image/jpeg")
