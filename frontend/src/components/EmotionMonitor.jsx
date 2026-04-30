import { useEffect, useRef, useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;
import EmotionIndicator from './EmotionIndicator';
import EmotionStats from './EmotionStats';
import '../styles/emotion.css';

const DEFAULT_PREDICTION = {
  emotion: 'Neutral',
  confidence: 0,
  risk_level: 'Low',
  driver_risk_score: 0,
  inference_ms: 0,
  icon: ':|',
  alert: false,
};

function playAlertTone() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 740;
  gain.gain.value = 0.001;
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
  oscillator.onended = () => context.close();
}

export default function EmotionMonitor({ summary }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const requestLockRef = useRef(false);
  const lastAlertRef = useRef(0);

  const [prediction, setPrediction] = useState(DEFAULT_PREDICTION);
  const [status, setStatus] = useState('Connecting to webcam...');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Webcam API unavailable in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play?.().catch(() => {
              setStatus('Camera connected, but playback could not start automatically.');
            });
          };
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraReady(true);
        setStatus('Monitoring driver emotion in real time.');
      } catch {
        setStatus('Camera permission denied or unavailable.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraReady) {
      return undefined;
    }

    const pollEmotion = async () => {
      if (requestLockRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }
      if (videoRef.current.readyState < 2 || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        return;
      }

      requestLockRef.current = true;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = 320;
      canvas.height = 180;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
        if (!blob) {
          throw new Error('Frame encoding failed');
        }

        const formData = new FormData();
        formData.append('file', blob, 'emotion-frame.jpg');

        const response = await fetch(`${API_URL}/api/emotion-detection/predict`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Emotion detection request failed.');
        }

        setPrediction(data);
        setStatus(data.alert ? 'Driver stress detected. Immediate attention recommended.' : 'Driver state stable.');

        if (data.alert && Date.now() - lastAlertRef.current > 5000) {
          lastAlertRef.current = Date.now();
          playAlertTone();
        }
      } catch {
        setStatus('Emotion analysis unavailable. Retrying...');
      } finally {
        requestLockRef.current = false;
      }
    };

    pollEmotion();
    const intervalId = window.setInterval(pollEmotion, 1200);
    return () => window.clearInterval(intervalId);
  }, [cameraReady]);

  return (
    <section className="emotion-monitor-shell">
      <div className="emotion-monitor-header">
        <div>
          <span className="eyebrow">REAL-TIME DRIVER EMOTION DETECTION</span>
          <h2>AI Emotion Control Center</h2>
        </div>
        <div className={`emotion-risk-chip ${prediction.risk_level?.toLowerCase() || 'low'}`}>
          Driver Risk: {prediction.risk_level || 'Low'}
        </div>
      </div>

      {prediction.alert && (
        <div className="emotion-warning-banner">
          <strong>WARNING</strong>
          <span>DRIVER STRESS DETECTED</span>
        </div>
      )}

      <div className="emotion-layout-grid">
        <div className="emotion-camera-card">
          <div className="emotion-camera-topline">
            <span className={`emotion-live-dot ${cameraReady ? 'live' : 'idle'}`} />
            <span>{status}</span>
          </div>

          <div className="emotion-video-frame">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="emotion-video-overlay">Emotion AI Stream</div>
          </div>
          <canvas ref={canvasRef} className="emotion-hidden-canvas" />
        </div>

        <div className="emotion-panel-stack">
          <EmotionIndicator
            emotion={prediction.emotion || 'Neutral'}
            confidence={prediction.confidence || 0}
            riskLevel={prediction.risk_level || 'Low'}
            driverRiskScore={prediction.driver_risk_score || 0}
            icon={prediction.icon || ':|'}
            inferenceMs={prediction.inference_ms || 0}
            live={cameraReady}
          />
          <EmotionStats summary={summary} prediction={prediction} />
        </div>
      </div>
    </section>
  );
}
