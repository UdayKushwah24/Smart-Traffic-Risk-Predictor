"""Alert API routes."""

from fastapi import APIRouter

from backend.database.mongo import get_alerts

router = APIRouter(tags=["alerts"])


@router.get("/alerts")
def list_alerts() -> dict:
    return {"alerts": get_alerts(user_id="system")}
