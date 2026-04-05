"""Thread-safe singleton loader for the emotion detection model."""

from __future__ import annotations

import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import joblib

from backend.config import EMOTION_CLASS_NAMES_PATH, EMOTION_LABEL_ENCODER_PATH, EMOTION_MODEL_PATH
from backend.utils.logger import get_logger

logger = get_logger("emotion.model_loader")


@dataclass
class EmotionAssets:
    model: Any
    label_encoder: Any
    class_names: list[str]


class EmotionModelLoader:
    _instance: "EmotionModelLoader | None" = None
    _instance_lock = Lock()

    def __init__(self) -> None:
        self._assets: EmotionAssets | None = None
        self._load_lock = Lock()

    @classmethod
    def instance(cls) -> "EmotionModelLoader":
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_assets(self) -> EmotionAssets:
        if self._assets is None:
            with self._load_lock:
                if self._assets is None:
                    self._assets = self._load_assets()
        return self._assets

    def _load_assets(self) -> EmotionAssets:
        model_path = Path(EMOTION_MODEL_PATH)
        label_encoder_path = Path(EMOTION_LABEL_ENCODER_PATH)
        class_names_path = Path(EMOTION_CLASS_NAMES_PATH)

        try:
            payload = joblib.load(model_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to load emotion model payload from {model_path}: {exc}") from exc

        try:
            label_encoder = joblib.load(label_encoder_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to load emotion label encoder from {label_encoder_path}: {exc}") from exc

        try:
            class_names_raw = joblib.load(class_names_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to load emotion class names from {class_names_path}: {exc}") from exc

        class_names = [str(name) for name in class_names_raw]
        if not class_names:
            raise RuntimeError(f"Emotion class names are empty in {class_names_path}.")

        if not isinstance(payload, dict):
            raise RuntimeError(
                f"Invalid emotion model payload in {model_path}. Expected a dict with key 'model_bytes'."
            )

        model_bytes = payload.get("model_bytes")
        if not isinstance(model_bytes, (bytes, bytearray)):
            raise RuntimeError(
                f"Invalid 'model_bytes' in {model_path}. Expected bytes or bytearray, got {type(model_bytes).__name__}."
            )

        model = self._load_keras_model(bytes(model_bytes))
        logger.info("Emotion model loaded with %s classes from %s", len(class_names), model_path.parent)
        return EmotionAssets(model=model, label_encoder=label_encoder, class_names=class_names)

    def _load_keras_model(self, model_bytes: bytes) -> Any:
        if sys.version_info >= (3, 13):
            raise RuntimeError(
                "TensorFlow is unavailable in this Python 3.13 runtime for emotion model loading."
            )

        try:
            import tensorflow as tf
        except ImportError as exc:
            raise RuntimeError(
                "TensorFlow is required to load the emotion model. Install dependencies from requirements.txt."
            ) from exc

        for suffix in (".keras", ".h5"):
            try:
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp_file:
                    temp_file.write(model_bytes)
                    temp_file.flush()
                    return tf.keras.models.load_model(temp_file.name, compile=False)
            except Exception as exc:
                logger.warning("Failed to load emotion model using %s: %s", suffix, exc)

        raise RuntimeError("Unable to reconstruct the emotion model from serialized bytes.")
