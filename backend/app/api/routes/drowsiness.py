"""Drowsiness detection routes."""

from fastapi import APIRouter, Response

from app.services.drowsiness_service import get_frame, get_state

router = APIRouter(tags=["drowsiness"])


@router.get("/drowsiness")
def read_drowsiness_state() -> dict:
	return get_state()


@router.get("/drowsiness/frame")
def read_drowsiness_frame() -> Response:
	frame = get_frame()
	if frame is None:
		return Response(status_code=503, media_type="application/json", content='{"error":"No frame available"}')
	return Response(content=frame, media_type="image/jpeg")
