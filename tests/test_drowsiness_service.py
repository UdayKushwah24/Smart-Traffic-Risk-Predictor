import unittest
from unittest.mock import patch
import time

import numpy as np

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

    def test_auto_mode_uses_mediapipe_when_probe_succeeds(self):
        with patch.dict("os.environ", {}, clear=False):
            with patch("backend.services.drowsiness_service._mediapipe_backend_available", return_value=True):
                backend = drowsiness_service._select_backend()

        self.assertEqual(backend, "mediapipe")

    def test_explicit_mediapipe_override_is_respected(self):
        with patch.dict("os.environ", {"DROWSINESS_BACKEND": "mediapipe"}, clear=False):
            with patch.object(drowsiness_service.sys, "version_info", (3, 14, 0)):
                backend = drowsiness_service._select_backend()

        self.assertEqual(backend, "mediapipe")

    def test_auto_mode_falls_back_to_opencv_when_probe_fails(self):
        with patch.dict("os.environ", {}, clear=False):
            with patch("backend.services.drowsiness_service._mediapipe_backend_available", return_value=False):
                backend = drowsiness_service._select_backend()

        self.assertEqual(backend, "opencv")

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

    def test_legacy_yawn_threshold_is_normalised_to_ratio(self):
        self.assertAlmostEqual(drowsiness_service._normalise_yawn_threshold(), 0.25)

    def test_yawn_counter_requires_consecutive_open_frames(self):
        started_at = time.time()
        frames = 0
        alert = False

        for i in range(config.YAWN_MIN_CONSEC_FRAMES):
            started_at, frames, seconds, _, alert = drowsiness_service._update_yawn_state(
                mouth_ratio=0.40,
                now=started_at + (i * 0.2),
                previous_started_at=started_at,
                previous_frames=frames,
            )

        self.assertFalse(alert)
        started_at, frames, seconds, _, alert = drowsiness_service._update_yawn_state(
            mouth_ratio=0.40,
            now=started_at + config.YAWN_MIN_DURATION_SECONDS + 0.1,
            previous_started_at=started_at,
            previous_frames=frames,
        )
        self.assertGreaterEqual(seconds, config.YAWN_MIN_DURATION_SECONDS)
        self.assertTrue(alert)

    def test_head_pose_alert_requires_full_duration(self):
        base_time = 100.0
        pose = {"off_center": True}

        started_at, seconds, alert = drowsiness_service._update_head_pose_timer(
            head_pose=pose,
            now=base_time,
            previous_started_at=None,
        )
        self.assertFalse(alert)

        _, seconds, alert = drowsiness_service._update_head_pose_timer(
            head_pose=pose,
            now=base_time + config.HEAD_POSE_ALERT_SECONDS + 0.05,
            previous_started_at=started_at,
        )
        self.assertGreaterEqual(seconds, config.HEAD_POSE_ALERT_SECONDS)
        self.assertTrue(alert)

    def test_head_pose_timer_resets_when_forward(self):
        started_at, seconds, alert = drowsiness_service._update_head_pose_timer(
            head_pose={"off_center": False},
            now=50.0,
            previous_started_at=40.0,
        )
        self.assertIsNone(started_at)
        self.assertEqual(seconds, 0.0)
        self.assertFalse(alert)

    def test_opencv_mouth_score_distinguishes_open_mouth_from_closed(self):
        closed = np.full((90, 140), 255, dtype=np.uint8)
        closed[55:58, 45:95] = 0

        open_mouth = np.full((90, 140), 255, dtype=np.uint8)
        yy, xx = np.ogrid[:90, :140]
        ellipse = ((xx - 70) ** 2) / (34 ** 2) + ((yy - 52) ** 2) / (16 ** 2) <= 1
        open_mouth[ellipse] = 0

        closed_score = drowsiness_service._estimate_mouth_open_score(closed)
        open_score = drowsiness_service._estimate_mouth_open_score(open_mouth)

        self.assertLess(closed_score, 0.01)
        self.assertGreater(open_score, closed_score + 0.02)

    def test_opencv_yawn_ratio_requires_tall_mouth_opening(self):
        closed = np.full((90, 140), 255, dtype=np.uint8)
        closed[55:58, 45:95] = 0

        smile_like = np.full((90, 140), 255, dtype=np.uint8)
        smile_like[56:63, 28:112] = 0

        open_mouth = np.full((90, 140), 255, dtype=np.uint8)
        yy, xx = np.ogrid[:90, :140]
        ellipse = ((xx - 70) ** 2) / (30 ** 2) + ((yy - 52) ** 2) / (18 ** 2) <= 1
        open_mouth[ellipse] = 0

        self.assertEqual(drowsiness_service._opencv_yawn_ratio(closed), 0.0)
        self.assertEqual(drowsiness_service._opencv_yawn_ratio(smile_like), 0.0)
        self.assertGreater(drowsiness_service._opencv_yawn_ratio(open_mouth), 0.25)


if __name__ == "__main__":
    unittest.main()
