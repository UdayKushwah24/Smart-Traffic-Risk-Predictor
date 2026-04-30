import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import EmotionMonitor from '../components/EmotionMonitor';
import '../styles/analytics.css';

const dailyRiskData = [
  { day: 'Mon', score: 78 },
  { day: 'Tue', score: 74 },
  { day: 'Wed', score: 69 },
  { day: 'Thu', score: 72 },
  { day: 'Fri', score: 66 },
  { day: 'Sat', score: 81 },
  { day: 'Sun', score: 76 },
];

const alertFrequencyData = [
  { hour: '00', alerts: 1 },
  { hour: '04', alerts: 0 },
  { hour: '08', alerts: 3 },
  { hour: '12', alerts: 5 },
  { hour: '16', alerts: 4 },
  { hour: '20', alerts: 2 },
];

export default function Analytics() {
  const [summary, setSummary] = useState({
    drowsiness_today: 0,
    yawning_events: 0,
    fog_alerts: 0,
    stress_alerts: 0,
    visibility_alerts: 0,
    child_presence_alerts: 0,
    emotion_events: 0,
    emotion_high_risk_events: 0,
    latest_emotion: 'Neutral',
    latest_emotion_confidence: 0,
    emotion_risk_level: 'Low',
    emotion_risk_score: 0,
    safety_score: 100,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const API_URL = import.meta.env.VITE_API_URL;
        const resp = await fetch(`${API_URL}/api/analytics/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.replace('/login');
          return;
        }
        const data = await resp.json();
        if (!resp.ok || data.error) {
          setError(data.error || 'Unable to fetch analytics summary');
          return;
        }
        setSummary(data);
      } catch {
        setError('Unable to fetch analytics summary');
      }
    };
    load();
  }, []);

  const totalAlerts =
    summary.drowsiness_today
    + summary.yawning_events
    + summary.fog_alerts
    + summary.stress_alerts
    + summary.visibility_alerts
    + summary.child_presence_alerts
    + summary.emotion_high_risk_events;
  const cards = [
    { title: 'Driver Safety Score', value: `${summary.safety_score}` },
    { title: 'Total Alerts', value: `${totalAlerts}` },
    { title: 'Fog Predictions', value: `${summary.fog_alerts}` },
    { title: 'Stress Alerts', value: `${summary.stress_alerts}` },
    { title: 'Visibility Alerts', value: `${summary.visibility_alerts}` },
    { title: 'Motion Alerts', value: `${summary.child_presence_alerts}` },
    { title: 'Drowsiness Events', value: `${summary.drowsiness_today}` },
    { title: 'Emotion Events', value: `${summary.emotion_events}` },
    { title: 'Latest Emotion', value: `${summary.latest_emotion}` },
  ];

  const heatmap = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        hour,
        intensity: Math.max(
          8,
          (summary.yawning_events * 6 + summary.fog_alerts * 8 + summary.emotion_high_risk_events * 11 + hour * 2) % 100
        ),
      })),
    [summary.yawning_events, summary.fog_alerts, summary.emotion_high_risk_events]
  );

  const emotionTrendData = useMemo(
    () =>
      dailyRiskData.map((entry, index) => ({
        ...entry,
        score: Math.max(20, entry.score - summary.emotion_high_risk_events + index),
      })),
    [summary.emotion_high_risk_events]
  );

  const alertTrendData = useMemo(
    () =>
      alertFrequencyData.map((entry, index) => ({
        ...entry,
        alerts: entry.alerts + (index % 3 === 0 ? summary.emotion_high_risk_events : 0),
      })),
    [summary.emotion_high_risk_events]
  );

  return (
    <div className="page-wrapper analytics-page">
      <div className="page-header">
        <h1>AI-Based Driver Risk Scoring Engine</h1>
        <p>Real-Time Drowsiness, Fog Detection and AI Risk Scoring Platform</p>
      </div>

      {error && <div className="analytics-error">{error}</div>}

      <EmotionMonitor summary={summary} />

      <div className="analytics-stats">
        {cards.map((card) => (
          <div className="analytics-stat" key={card.title}>
            <div className="a-stat-value">{card.value}</div>
            <div className="a-stat-label">{card.title}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="analytics-chart-area">
          <div className="chart-header">
            <h3>Daily Risk Score</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={emotionTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#a0a0b8" />
                <YAxis stroke="#a0a0b8" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#00e5ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="analytics-chart-area">
          <div className="chart-header">
            <h3>Alert Frequency</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={alertTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="#a0a0b8" />
                <YAxis stroke="#a0a0b8" />
                <Tooltip />
                <Line type="monotone" dataKey="alerts" stroke="#e81cff" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="analytics-chart-area">
        <div className="chart-header">
          <h3>Risk Intensity per Hour</h3>
        </div>
        <div className="heatmap-grid">
          {heatmap.map((slot) => (
            <div className="heatmap-cell" key={slot.hour}>
              <div
                className="heatmap-fill"
                style={{ opacity: slot.intensity / 100 }}
                title={`Hour ${slot.hour}:00 intensity ${slot.intensity}`}
              />
              <span>{slot.hour.toString().padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
