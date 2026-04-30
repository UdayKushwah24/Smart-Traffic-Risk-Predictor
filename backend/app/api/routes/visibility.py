"""Visibility detection routes."""

from fastapi import APIRouter, HTTPException

from app.services.drowsiness_service import get_frame
from app.services.visibility_service import get_state, predict, set_engine

router = APIRouter(tags=["visibility"])


@router.get("/visibility")
def read_visibility_state() -> dict:
	return get_state()


@router.post("/visibility/predict-frame")
def predict_visibility_from_camera() -> dict:
	frame = get_frame()
	if frame is None:
		raise HTTPException(status_code=503, detail="No camera frame available")
	return predict(frame, user_id="system", image_name="camera_frame.jpg")


@router.post("/visibility/engine")
def toggle_visibility_engine(on: bool) -> dict:
	return set_engine(on)
