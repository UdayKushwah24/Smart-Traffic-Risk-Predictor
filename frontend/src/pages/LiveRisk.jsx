import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/liverisk.css';

/* ── Uses relative path so Vite proxy handles it in dev,
      and FastAPI serves it directly in production ── */
const WS_URL = `ws://${window.location.host}/ws/risk`;

export default function LiveRisk() {
  const [isActive, setIsActive] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const keepAliveRef = useRef(null);

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

  const getRiskColor = useCallback((level) => {
    switch (level) {
      case 'critical': return '#ff2b2b';
      case 'high':     return '#ff8c00';
      case 'moderate': return '#ffd700';
      case 'low':      return '#00e676';
      default:         return '#666';
    }
  }, []);

  const riskColor = riskData ? getRiskColor(riskData.risk_level) : '#666';

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

        {/* ── Real-Time Risk Score Display ── */}
        {isActive && riskData && (
          <div className="risk-live-section">
            {/* Unified Risk Gauge */}
            <div className="risk-score-gauge" style={{ borderColor: riskColor }}>
              <div className="risk-score-number" style={{ color: riskColor }}>
                {riskData.overall_score}
              </div>
              <div className="risk-score-label">Driver Risk Score</div>
              <div className="risk-level-badge" style={{ background: riskColor }}>
                {riskData.risk_level?.toUpperCase()}
              </div>
            </div>

            {/* Module Cards */}
            <div className="risk-modules-row">
              {/* Drowsiness Module */}
              <div className={`risk-module-card ${riskData.drowsiness?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">😴</span>
                  <span className="module-title">Drowsiness Detection</span>
                  <span className={`module-dot ${riskData.drowsiness?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>EAR</span>
                    <strong>{riskData.drowsiness?.ear?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Drowsy</span>
                    <strong className={riskData.drowsiness?.drowsy ? 'alert' : ''}>
                      {riskData.drowsiness?.drowsy ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Yawning</span>
                    <strong className={riskData.drowsiness?.yawning ? 'alert' : ''}>
                      {riskData.drowsiness?.yawning ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{riskData.drowsiness?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Fog Module */}
              <div className={`risk-module-card ${riskData.fog?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🌫</span>
                  <span className="module-title">Fog / Visibility</span>
                  <span className={`module-dot ${riskData.fog?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Visibility</span>
                    <strong>{riskData.fog?.prediction ?? '—'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Confidence</span>
                    <strong>
                      {riskData.fog?.confidence != null
                        ? `${riskData.fog.confidence}%`
                        : '—'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{riskData.fog?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Stress Module */}
              <div className={`risk-module-card ${riskData.stress?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🎙️</span>
                  <span className="module-title">Stress Detection</span>
                  <span className={`module-dot ${riskData.stress?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Level</span>
                    <strong>{riskData.stress?.level ?? 'Normal'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Confidence</span>
                    <strong>
                      {riskData.stress?.confidence != null
                        ? `${Math.round(riskData.stress.confidence * 100)}%`
                        : '—'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Source</span>
                    <strong>{riskData.stress?.source ?? 'idle'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{riskData.stress?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Visibility Module */}
              <div className={`risk-module-card ${riskData.visibility?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">🌤️</span>
                  <span className="module-title">Visibility Analysis</span>
                  <span className={`module-dot ${riskData.visibility?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Condition</span>
                    <strong>{riskData.visibility?.condition ?? 'Unknown'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Brightness</span>
                    <strong>{riskData.visibility?.brightness ?? 0}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Blur Var</span>
                    <strong>{riskData.visibility?.blur_var ?? 0}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{riskData.visibility?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Child Presence Module */}
              <div className={`risk-module-card ${riskData.child_presence?.active ? 'online' : 'offline'}`}>
                <div className="module-header">
                  <span className="module-icon">👶</span>
                  <span className="module-title">Child Presence</span>
                  <span className={`module-dot ${riskData.child_presence?.active ? 'on' : 'off'}`}></span>
                </div>
                <div className="module-body">
                  <div className="module-metric">
                    <span>Engine</span>
                    <strong>{riskData.child_presence?.engine_on ? 'ON' : 'OFF'}</strong>
                  </div>
                  <div className="module-metric">
                    <span>Motion</span>
                    <strong className={riskData.child_presence?.motion ? 'alert' : ''}>
                      {riskData.child_presence?.motion ? '⚠ YES' : '✓ No'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Alert</span>
                    <strong className={riskData.child_presence?.alert ? 'alert' : ''}>
                      {riskData.child_presence?.alert ? '⚠ ACTIVE' : '✓ Clear'}
                    </strong>
                  </div>
                  <div className="module-metric">
                    <span>Risk</span>
                    <strong>{riskData.child_presence?.risk_score ?? 0}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Modules Count */}
            <div className="risk-info-row">
              <div className="risk-info-card">
                <div className="info-icon">🧠</div>
                <div className="info-title">Active Modules</div>
                <div className="info-value">{riskData.active_modules ?? 0} / 5</div>
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
