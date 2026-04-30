import unittest
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.services import kid_safety_service


class KidSafetyServiceTests(unittest.TestCase):
    def setUp(self):
        kid_safety_service._alone_started_at = None
        kid_safety_service._last_danger_alert_ts = 0.0

    def _predict_with_buckets(self, buckets, now=100.0):
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        boxes = [
            (10 + (idx * 40), 20, 50 + (idx * 40), 80, 0.91)
            for idx in range(len(buckets))
        ]

        with patch.object(kid_safety_service, "_ensure_models", return_value=True):
            with patch.object(kid_safety_service, "_face_net", object()):
                with patch.object(kid_safety_service, "_age_net", object()):
                    with patch.object(kid_safety_service, "detect_faces", return_value=boxes):
                        with patch.object(kid_safety_service, "classify_age", side_effect=buckets):
                            with patch.object(kid_safety_service.time, "time", return_value=now):
                                with patch.object(kid_safety_service, "log_alert", return_value="1"):
                                    return kid_safety_service._update_from_frame(frame, "user-1")

    def test_child_with_adult_is_safe(self):
        payload = self._predict_with_buckets(["(4-6)", "(25-32)"])

        self.assertTrue(payload["kid_detected"])
        self.assertTrue(payload["adult_present"])
        self.assertEqual(payload["status"], "SAFE")
        self.assertEqual(payload["message"], "Adult present with child")
        self.assertLessEqual(payload["risk"], 10)

    def test_child_alone_starts_as_warning(self):
        payload = self._predict_with_buckets(["(8-12)"], now=100.0)

        self.assertTrue(payload["kid_detected"])
        self.assertFalse(payload["adult_present"])
        self.assertEqual(payload["status"], "WARNING")
        self.assertEqual(payload["risk"], 40.0)

    def test_child_alone_after_threshold_is_danger(self):
        kid_safety_service._alone_started_at = 95.0

        payload = self._predict_with_buckets(["(0-2)"], now=100.0)

        self.assertEqual(payload["status"], "DANGER")
        self.assertGreaterEqual(payload["risk"], 85)
        self.assertEqual(payload["message"], "Child alone in car")
        self.assertGreaterEqual(payload["alone_seconds"], 2.0)

    def test_no_face_response_matches_contract(self):
        with patch.object(kid_safety_service, "_ensure_models", return_value=True):
            with patch.object(kid_safety_service, "_face_net", object()):
                with patch.object(kid_safety_service, "_age_net", object()):
                    with patch.object(kid_safety_service, "detect_faces", return_value=[]):
                        payload = kid_safety_service._update_from_frame(
                            np.zeros((80, 80, 3), dtype=np.uint8),
                            "user-1",
                        )

        self.assertFalse(payload["kid_detected"])
        self.assertFalse(payload["adult_present"])
        self.assertEqual(payload["status"], "NO_FACE")
        self.assertEqual(payload["risk"], 0.0)
        self.assertEqual(payload["message"], "No occupant detected")


class KidSafetyRouteTests(unittest.TestCase):
    def test_root_kid_safety_endpoint_returns_state(self):
        client = TestClient(app)
        state = {
            "kid_detected": False,
            "adult_present": False,
            "status": "NO_FACE",
            "risk": 0,
            "message": "No occupant detected",
        }

        with patch("backend.routes.api.drowsiness_service.get_frame", return_value=None):
            with patch("backend.routes.api.kid_safety_service.get_state", return_value=state):
                response = client.get("/kid-safety")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), state)


if __name__ == "__main__":
    unittest.main()
