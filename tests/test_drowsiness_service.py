import unittest
from unittest.mock import patch

from backend import config
from backend.services import drowsiness_service
from backend.services.risk_engine import calculate_drowsiness_risk


class DrowsinessServiceConfigTests(unittest.TestCase):
    def test_auto_mode_keeps_service_enabled(self):
        with patch.dict("os.environ", {"ENABLE_DROWSINESS_SERVICE": "auto"}, clear=False):
            enabled, reason = config._resolve_drowsiness_service_setting()

        self.assertTrue(enabled)
        self.assertEqual(reason, "")

    def test_false_env_disables_service(self):
        with patch.dict("os.environ", {"ENABLE_DROWSINESS_SERVICE": "false"}, clear=False):
            enabled, reason = config._resolve_drowsiness_service_setting()

        self.assertFalse(enabled)
        self.assertIn("ENABLE_DROWSINESS_SERVICE=false", reason)

    def test_python_313_prefers_opencv_fallback(self):
        with patch.dict("os.environ", {}, clear=False):
            with patch.object(drowsiness_service.sys, "version_info", (3, 13, 0)):
                backend = drowsiness_service._select_backend()

        self.assertEqual(backend, "opencv")

    def test_explicit_mediapipe_override_is_respected(self):
        with patch.dict("os.environ", {"DROWSINESS_BACKEND": "mediapipe"}, clear=False):
            with patch.object(drowsiness_service.sys, "version_info", (3, 13, 0)):
                backend = drowsiness_service._select_backend()

        self.assertEqual(backend, "mediapipe")

    def test_alert_loop_starts_only_for_confirmed_drowsiness(self):
        with patch("backend.services.drowsiness_service.start_alert_loop") as start_alert_loop:
            with patch("backend.services.drowsiness_service.stop_alert") as stop_alert:
                drowsiness_service._handle_alert_transitions(
                    drowsy=True,
                    yawning=False,
                    ear_val=0.2,
                    prev_drowsy=False,
                    prev_yawning=False,
                )

        start_alert_loop.assert_called_once_with("drowsiness")
        stop_alert.assert_called_once_with("yawning")

    def test_alerts_stop_when_detection_clears(self):
        with patch("backend.services.drowsiness_service.start_alert_loop") as start_alert_loop:
            with patch("backend.services.drowsiness_service.stop_alert") as stop_alert:
                drowsiness_service._handle_alert_transitions(
                    drowsy=False,
                    yawning=False,
                    ear_val=None,
                    prev_drowsy=True,
                    prev_yawning=False,
                )

        start_alert_loop.assert_not_called()
        self.assertEqual(stop_alert.call_count, 2)
        stop_alert.assert_any_call("drowsiness")
        stop_alert.assert_any_call("yawning")

    def test_no_face_detected_means_no_drowsiness_risk(self):
        risk = calculate_drowsiness_risk(
            {
                "active": True,
                "face_detected": False,
                "drowsy": False,
                "yawning": False,
                "ear": None,
            }
        )

        self.assertEqual(risk, 0.0)


if __name__ == "__main__":
    unittest.main()
