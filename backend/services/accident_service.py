"""
Road Accident Severity Prediction Service.

Loads a pre-trained XGBoost model + LabelEncoder (joblib)
and exposes a predict() function used by the API route.
"""

import joblib
import pandas as pd
from pathlib import Path

from backend.config import MODELS_DIR
from backend.utils.logger import get_logger

logger = get_logger("accident_service")

# ── Model paths ──────────────────────────────────────────────────────
_MODEL_PATH = MODELS_DIR / "accident_prediction_model.pkl"
_ENCODER_PATH = MODELS_DIR / "label_encoder.pkl"

# ── Module-level references (loaded once) ────────────────────────────
_model = None
_label_encoder = None


def load_model():
    """Load the accident prediction model and label encoder from disk."""
    global _model, _label_encoder
    try:
        _model = joblib.load(str(_MODEL_PATH))
        _label_encoder = joblib.load(str(_ENCODER_PATH))
        logger.info("Accident prediction model loaded successfully")
    except FileNotFoundError as e:
        logger.warning(f"Accident model files not found: {e}")
    except Exception as e:
        logger.error(f"Failed to load accident model: {e}")


def is_loaded() -> bool:
    """Check whether model is ready."""
    return _model is not None and _label_encoder is not None


def predict(input_data: dict) -> dict:
    """
    Run accident severity prediction.

    Parameters
    ----------
    input_data : dict
        Keys: State, City, No_of_Vehicles, Road_Type, Road_Surface,
              Light_Condition, Weather, Casualty_Class, Casualty_Sex,
              Casualty_Age, Vehicle_Type

    Returns
    -------
    dict  with  prediction (str) and input_data echo
    """
    if not is_loaded():
        load_model()
    if not is_loaded():
        return {"error": "Model not loaded", "prediction": None}

    try:
        df = pd.DataFrame([input_data])
        raw_pred = _model.predict(df)
        severity = _label_encoder.inverse_transform(raw_pred)[0]
        return {
            "prediction": severity,
            "input_data": input_data,
        }
    except Exception as e:
        logger.error(f"Accident prediction error: {e}")
        return {"error": str(e), "prediction": None}
