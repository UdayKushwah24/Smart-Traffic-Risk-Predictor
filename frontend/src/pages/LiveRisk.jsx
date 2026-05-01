import { useState, useEffect, useRef, useCallback } from 'react';
import KidSafetyCard from '../components/KidSafetyCard';
import '../styles/liverisk.css';

/* ── Build backend API and WS URL from Vite env `VITE_API_URL`. Falls back to origin. ── */
const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws/risk`;
const FRAME_CAPTURE_INTERVAL_MS = 500;

export default function LiveRisk() {
  const [isActive, setIsActive] = useState(true);
  const [riskData, setRiskData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [apiReconnecting, setApiReconnecting] = useState(false);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const fallbackRiskData = {
    overall_score: 0,
    risk_level: 'low',
    drowsiness: { active: false },
    fog: { active: false },
    stress: { active: false },
    visibility: { active: false },
    motion_detection: { active: false },
    active_modules: 0,
  };
  const [kidSafetyData, setKidSafetyData] = useState({
    active: false,
    kid_detected: false,
    adult_present: false,
    status: 'NO_FACE',
    risk: 0,
    message: 'No occupant detected',
    alone_seconds: 0,
    boxes: [],
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const keepAliveRef = useRef(null);
  const kidSafetyTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameCaptureTimerRef = useRef(null);
  const frameUploadInFlightRef = useRef(false);
  const loadingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const dangerPlayedRef = useRef(false);

  // WebSocket connection management
  useEffect(() => {
    if (isActive) {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send('ping');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setRiskData(data);
        } catch { /* ignore non-JSON */ }
      };

      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);

      // Keep-alive ping every 25s
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 25000);

      return () => {
        clearInterval(keepAliveRef.current);
        ws.close();
        wsRef.current = null;
      };
    } else {
      setRiskData(null);
      setConnected(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [isActive]);

  useEffect(() => {
    const stopStreaming = () => {
      frameUploadInFlightRef.current = false;
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setIsFrameLoading(false);
      if (frameCaptureTimerRef.current) {
        clearInterval(frameCaptureTimerRef.current);
        frameCaptureTimerRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!isActive) {
      stopStreaming();
      return undefined;
    }

    let cancelled = false;

    const sendCurrentFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || frameUploadInFlightRef.current) return;
      if (video.readyState < 2) return;

      frameUploadInFlightRef.current = true;
      if (!loadingTimerRef.current) {
        loadingTimerRef.current = setTimeout(() => {
          if (!cancelled) setIsFrameLoading(true);
        }, 220);
      }
      try {
        const targetWidth = 640;
        const sourceWidth = video.videoWidth || targetWidth;
        const sourceHeight = video.videoHeight || 480;
        const targetHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * targetWidth));

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.72);

        const resp = await fetch(`${API_URL}/api/process-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        const data = await resp.json();
        if (!cancelled && resp.ok && !data.error) {
          setRiskData(data);
          setApiReconnecting(false);
        } else if (!cancelled) {
          setApiReconnecting(true);
        }
      } catch {
        if (!cancelled) setApiReconnecting(true);
      } finally {
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        setIsFrameLoading(false);
        frameUploadInFlightRef.current = false;
      }
    };

    const startStreaming = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        setCameraError('');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        frameCaptureTimerRef.current = setInterval(sendCurrentFrame, FRAME_CAPTURE_INTERVAL_MS);
      } catch {
        setCameraError('Camera not available');
        setIsActive(false);
      }
    };

    startStreaming();

    return () => {
      cancelled = true;
      stopStreaming();
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setKidSafetyData({
        active: false,
        kid_detected: false,
        adult_present: false,
        status: 'NO_FACE',
        risk: 0,
        message: 'No occupant detected',
        alone_seconds: 0,
        boxes: [],
      });
      dangerPlayedRef.current = false;
      if (kidSafetyTimerRef.current) {
        clearInterval(kidSafetyTimerRef.current);
        kidSafetyTimerRef.current = null;
      }
      return undefined;
    }

    const fetchKidSafety = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`${API_URL}/kid-safety`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await resp.json();
        if (resp.ok && !data.error) {
          setKidSafetyData(data);
        }
      } catch {
        // Keep the last good state to avoid UI jitter.
      }
    };

    fetchKidSafety();
    kidSafetyTimerRef.current = setInterval(fetchKidSafety, 1500);

    return () => {
      if (kidSafetyTimerRef.current) {
        clearInterval(kidSafetyTimerRef.current);
        kidSafetyTimerRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (kidSafetyData.status !== 'DANGER' || dangerPlayedRef.current) {
      if (kidSafetyData.status !== 'DANGER') {
        dangerPlayedRef.current = false;
      }
      return undefined;
    }

    dangerPlayedRef.current = true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return undefined;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const playTone = (frequency, startOffset, duration) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.0001, context.currentTime + startOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + startOffset + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + startOffset + duration);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(context.currentTime + startOffset);
        oscillator.stop(context.currentTime + startOffset + duration);
      };

      playTone(880, 0, 0.22);
      playTone(880, 0.28, 0.22);
      playTone(660, 0.56, 0.32);
    } catch {
      // Audio alerts are best-effort.
    }
    return undefined;
  }, [kidSafetyData.status]);

  const activeRiskData = riskData ?? fallbackRiskData;

  const getRiskColor = useCallback((level) => {
    switch (level) {
      case 'critical': return '#ff2b2b';
      case 'high':     return '#ff8c00';
      case 'moderate': return '#ffd700';
      case 'low':      return '#00e676';
      default:         return '#666';
    }
  }, []);

  const riskColor = getRiskColor(activeRiskData.risk_level);

  return (
    <div className="page-wrapper liverisk-page">
      <div className={`risk-bg-glow${isActive ? ' active' : ''}`}></div>

      <div className="page-header">
        <h1>Live Risk Detection</h1>
        <p>Toggle AI-powered real-time driver safety monitoring system</p>
      </div>

      <div className="risk-control-panel">
        {/* Torch Toggle */}
        <label className="torch-container">
          <div className="torch-text">Activate AI Monitoring</div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setIsActive(!isActive)}
          />
          <div className="checkmark"></div>
          <div className="torch">
            <div className="torch-head">
              <div className="torch-face top">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
              <div className="torch-face left">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
              <div className="torch-face right">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            <div className="torch-stick">
              <div className="torch-side side-left">
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
              </div>
              <div className="torch-side side-right">
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
              </div>
            </div>
          </div>
        </label>

        {/* Status Panel */}
        <div className={`risk-status-panel ${isActive ? 'active' : 'inactive'}`}>
          <div className="risk-status-label">AI Monitoring Status</div>
          <div
            className={`risk-status-value ${isActive ? 'active' : 'inactive'}`}
            key={isActive ? 'active' : 'inactive'}
          >
            {isActive
              ? connected ? '● CONNECTED' : '● CONNECTING…'
              : '○ INACTIVE'}
          </div>
        </div>

        {isActive && (
          <div className="risk-status-panel active" style={{ maxWidth: '760px', marginTop: '12px' }}>
            <div className="risk-status-label">Live Camera Stream</div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', borderRadius: '12px', marginTop: '10px', background: '#111' }}
            />
            {isFrameLoading && (
              <div className="risk-inline-status">
                <span className="risk-spinner" aria-hidden="true"></span>
                <span>Processing frame...</span>
              </div>
            )}
            {apiReconnecting && (
              <div className="risk-inline-status warning">Reconnecting...</div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {cameraError && (
          <div className="risk-status-panel inactive" style={{ maxWidth: '760px' }}>
            <div className="risk-status-label">Camera Status</div>
            <div className="risk-status-value inactive">{cameraError}</div>
          </div>
        )}

        {/* ── Real-Time Risk Score Display ── */}
        {(isActive || !riskData) && (
          <div className="risk-live-section">
            {/* Unified Risk Gauge */}
            <div className="risk-score-gauge" style={{ borderColor: riskColor }}>
              <div className="risk-score-number" style={{ color: riskColor }}>
                {activeRiskData.overall_score}
              </div>
              <div className="risk-score-label">Driver Risk Score</div>
              <div className="risk-level-badge" style={{ background: riskColor }}>
                {activeRiskData.risk_level?.toUpperCase()}
              </div>
            </div>

            {!isActive && !riskData && (
              <div className="risk-status-panel active" style={{ maxWidth: '420px' }}>
                <div className="risk-status-label">Waiting for Stream</div>
                <div className="risk-status-value active">● CONNECTING…</div>
              </div>
            )}

            {/* Module Cards */}
            <div className="risk-modules-row">
              {/* Drowsiness Module */}
              <div className={`risk-module-card ${activeRiskData.drowsiness?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">😴</span>
                  <span className="module-title">Drowsiness Detection</span>
                  <span className={`module-dot ${activeRiskData.drowsiness?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>EAR</span>
                    <strong>{activeRiskData.drowsiness?.ear?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Drowsy</span>
                    <strong className={activeRiskData.drowsiness?.drowsy ? 'alert' : ''}>
                      {activeRiskData.drowsiness?.drowsy ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Yawning</span>
                    <strong className={activeRiskData.drowsiness?.yawning ? 'alert' : ''}>
                      {activeRiskData.drowsiness?.yawning ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Head Direction</span>
                    <strong>
                      {(activeRiskData.drowsiness?.head_pose?.direction || 'forward').toUpperCase()}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Off-Road Time</span>
                    <strong className={activeRiskData.drowsiness?.head_pose?.alert ? 'alert' : ''}>
                      {activeRiskData.drowsiness?.head_pose?.seconds != null
                        ? `${activeRiskData.drowsiness.head_pose.seconds}s`
                        : '0.0s'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Focus Alert</span>
                    <strong className={activeRiskData.drowsiness?.head_pose?.alert ? 'alert' : ''}>
                      {activeRiskData.drowsiness?.alert_message || '✓ Clear'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{activeRiskData.drowsiness?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Fog Module */}
              <div className={`risk-module-card ${activeRiskData.fog?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🌫</span>
                  <span className="module-title">Fog / Visibility</span>
                  <span className={`module-dot ${activeRiskData.fog?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Visibility</span>
                    <strong>{activeRiskData.fog?.prediction ?? '—'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Confidence</span>
                    <strong>
                      {activeRiskData.fog?.confidence != null
                        ? `${activeRiskData.fog.confidence}%`
                        : '—'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{activeRiskData.fog?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Stress Module */}
              <div className={`risk-module-card ${activeRiskData.stress?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🎙️</span>
                  <span className="module-title">Stress Detection</span>
                  <span className={`module-dot ${activeRiskData.stress?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Level</span>
                    <strong>{activeRiskData.stress?.level ?? 'Normal'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Confidence</span>
                    <strong>
                      {activeRiskData.stress?.confidence != null
                        ? `${Math.round(activeRiskData.stress.confidence * 100)}%`
                        : '—'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Source</span>
                    <strong>{activeRiskData.stress?.source ?? 'idle'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{activeRiskData.stress?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Visibility Module */}
              <div className={`risk-module-card ${activeRiskData.visibility?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🌤️</span>
                  <span className="module-title">Visibility Analysis</span>
                  <span className={`module-dot ${activeRiskData.visibility?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Condition</span>
                    <strong>{activeRiskData.visibility?.condition ?? 'Unknown'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Brightness</span>
                    <strong>{activeRiskData.visibility?.brightness ?? 0}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Blur Var</span>
                    <strong>{activeRiskData.visibility?.blur_var ?? 0}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{activeRiskData.visibility?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Kid Safety Module */}
              <KidSafetyCard data={kidSafetyData} debug={import.meta.env.VITE_KID_SAFETY_DEBUG === 'true'} />

              {/* Motion Detection Module */}
              <div className={`risk-module-card ${activeRiskData.motion_detection?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">📡</span>
                  <span className="module-title">Motion Detection</span>
                  <span className={`module-dot ${activeRiskData.motion_detection?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Motion Engine</span>
                    <strong>{activeRiskData.motion_detection?.engine_on ? 'ON' : 'OFF'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Motion Detected</span>
                    <strong className={activeRiskData.motion_detection?.motion ? 'alert' : ''}>
                      {activeRiskData.motion_detection?.motion ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Motion Alert</span>
                    <strong className={activeRiskData.motion_detection?.alert ? 'alert' : ''}>
                      {activeRiskData.motion_detection?.alert ? '⚠ ACTIVE' : '✓ Clear'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Motion Risk</span>
                    <strong>{activeRiskData.motion_detection?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Modules Count */}
            <div className="risk-info-row">
              <div className="risk-info-card">
                <div className="info-icon">🧠</div>
                <div className="info-title">Active Modules</div>
                <div className="info-value">{activeRiskData.active_modules ?? 0} / 7</div>
              </div>
              <div className="risk-info-card">
                <div className="info-icon">⚡</div>
                <div className="info-title">Update Rate</div>
                <div className="info-value">1s</div>
              </div>
              <div className="risk-info-card">
                <div className="info-icon">📡</div>
                <div className="info-title">Connection</div>
                <div className="info-value">{connected ? 'Live' : 'Lost'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder when inactive */}
        {!isActive && (
          <div className="risk-info-row">
            <div className="risk-info-card">
              <div className="info-icon">🎯</div>
              <div className="info-title">Accuracy</div>
              <div className="info-value">—</div>
            </div>
            <div className="risk-info-card">
              <div className="info-icon">⚡</div>
              <div className="info-title">Latency</div>
              <div className="info-value">—</div>
            </div>
            <div className="risk-info-card">
              <div className="info-icon">📡</div>
              <div className="info-title">Data Points</div>
              <div className="info-value">—</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
