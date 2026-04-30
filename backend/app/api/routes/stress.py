"""Stress detection routes."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.stress_service import get_state, predict_from_bytes

router = APIRouter(tags=["stress"])


@router.get("/stress")
def read_stress_state() -> dict:
	return get_state()


@router.post("/stress/upload")
async def upload_stress_audio(file: UploadFile = File(...)) -> dict:
	if not file.content_type or not file.content_type.startswith("audio/"):
		raise HTTPException(status_code=400, detail="Invalid audio format")
	contents = await file.read()
	return predict_from_bytes(contents, filename=file.filename or "sample.wav")
