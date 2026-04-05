import unittest
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

from backend.emotion_detection import emotion_model_loader, emotion_predictor
from backend.main import app


class DummyModel:
    def __init__(self, probabilities):
        self._probabilities = probabilities

    def predict(self, batch, verbose=0):
        assert batch.shape[0] == 1
        return np.array([self._probabilities], dtype=np.float32)


class EmotionDetectionTests(unittest.TestCase):
    def test_model_loader_builds_assets(self):
        payload = {
            'format': 'keras_bytes',
            'model_bytes': b'model-bytes',
            'class_names': ['angry', 'neutral'],
        }
        encoder = type('Encoder', (), {'classes_': np.array(['angry', 'neutral'])})()

        def fake_joblib_load(path):
            path = str(path)
            if path.endswith('emotion_detection_model.pkl'):
                return payload
            if path.endswith('label_encoder.pkl'):
                return encoder
            if path.endswith('class_names.pkl'):
                return ['angry', 'neutral']
            raise AssertionError(path)

        with patch.object(emotion_model_loader.joblib, 'load', side_effect=fake_joblib_load):
            with patch.object(
                emotion_model_loader.EmotionModelLoader,
                '_load_keras_model',
                lambda self, _: DummyModel([0.91, 0.09]),
            ):
                loader = emotion_model_loader.EmotionModelLoader()
                assets = loader.get_assets()

        self.assertEqual(assets.class_names, ['angry', 'neutral'])
        self.assertIsInstance(assets.model, DummyModel)

    def test_prediction_returns_high_risk(self):
        assets = emotion_model_loader.EmotionAssets(
            model=DummyModel([0.87, 0.13]),
            label_encoder=None,
            class_names=['angry', 'neutral'],
        )

        class DummyLoader:
            def get_assets(self):
                return assets

        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        with patch.object(emotion_predictor, 'log_emotion_event', lambda **kwargs: '1'):
            with patch.object(emotion_predictor, 'log_alert', lambda **kwargs: '1'):
                prediction = emotion_predictor.predict_from_frame(frame, loader=DummyLoader())

        self.assertEqual(prediction.emotion, 'Angry')
        self.assertEqual(prediction.risk_level, 'High')
        self.assertGreater(prediction.confidence, 0.8)

    def test_api_endpoint_returns_prediction(self):
        client = TestClient(app)
        with patch('backend.emotion_detection.emotion_routes.decode_upload_bytes', lambda image_bytes: np.zeros((8, 8, 3), dtype=np.uint8)):
            with patch(
                'backend.emotion_detection.emotion_routes.predict_from_frame',
                lambda frame: emotion_predictor.EmotionPrediction(
                    emotion='Angry',
                    confidence=0.87,
                    risk_level='High',
                    risk_score=20.88,
                    driver_risk_score=83,
                    inference_ms=48.5,
                    icon='!!',
                ),
            ):
                response = client.post(
                    '/api/emotion-detection/predict',
                    files={'file': ('frame.jpg', b'fake-image-bytes', 'image/jpeg')},
                )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['emotion'], 'Angry')
        self.assertEqual(payload['risk_level'], 'High')
        self.assertEqual(payload['confidence'], 0.87)


if __name__ == '__main__':
    unittest.main()
