"""Facade for kid-safety detection services."""

from backend.services.kid_safety_service import get_state, load_model, predict


detect_kid = predict
