import '../styles/emotion.css';

const RISK_CLASS = {
  Low: 'safe',
  Medium: 'moderate',
  High: 'danger',
};

export default function EmotionIndicator({ emotion, confidence, riskLevel, driverRiskScore, icon, inferenceMs, live }) {
  const indicatorClass = RISK_CLASS[riskLevel] || 'safe';

  return (
    <div className={`emotion-indicator-card ${indicatorClass}`}>
      <div className="emotion-indicator-topline">
        <div className="emotion-live-status">
          <span className={`emotion-live-dot ${live ? 'live' : 'idle'}`} />
          <span>{live ? 'AI LIVE' : 'AI IDLE'}</span>
        </div>
        <span className="emotion-latency">{Math.round(inferenceMs)} ms</span>
      </div>

      <div className="emotion-face-block">
        <div className="emotion-icon-shell">{icon}</div>
        <div>
          <div className="emotion-label">Driver Emotion</div>
          <div className="emotion-value">{emotion}</div>
        </div>
      </div>

      <div className="emotion-metric-grid">
        <div>
          <span className="emotion-metric-label">Confidence</span>
          <strong>{Math.round(confidence * 100)}%</strong>
        </div>
        <div>
          <span className="emotion-metric-label">Risk Level</span>
          <strong>{riskLevel}</strong>
        </div>
        <div>
          <span className="emotion-metric-label">Driver Risk</span>
          <strong>{driverRiskScore}</strong>
        </div>
      </div>
    </div>
  );
}
