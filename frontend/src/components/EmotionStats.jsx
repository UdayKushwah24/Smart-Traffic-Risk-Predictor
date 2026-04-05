import '../styles/emotion.css';

export default function EmotionStats({ summary, prediction }) {
  const stats = [
    { label: 'Emotion Events Today', value: summary.emotion_events ?? 0 },
    { label: 'High Risk Emotion Alerts', value: summary.emotion_high_risk_events ?? 0 },
    { label: 'Latest Emotion Confidence', value: `${Math.round((summary.latest_emotion_confidence ?? prediction.confidence ?? 0) * 100)}%` },
    { label: 'Emotion Risk Score', value: summary.emotion_risk_score ?? 0 },
  ];

  return (
    <div className="emotion-stats-card">
      <div className="emotion-panel-heading">
        <span className="eyebrow">AI STATUS PANEL</span>
        <h3>Emotion Risk Telemetry</h3>
      </div>

      <div className="emotion-stats-grid">
        {stats.map((stat) => (
          <div className="emotion-stat-tile" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
