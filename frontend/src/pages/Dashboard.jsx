import { useState, useEffect } from 'react';
const API_URL = import.meta.env.VITE_API_URL;
import '../styles/dashboard.css';

const cards = [
  {
    title: 'Live Risk Status',
    icon: '🔴',
    desc: 'Real-time unified driver risk score from all safety modules',
    color: '252, 142, 142',
  },
  {
    title: 'Drowsiness Monitor',
    icon: '😴',
    desc: 'Eye aspect ratio & yawn detection via webcam',
    color: '142, 202, 252',
  },
  {
    title: 'Fog Detection',
    icon: '🌫',
    desc: 'Fog probability and visual hazard analysis from camera frames',
    color: '142, 252, 204',
  },
  {
    title: 'Stress Detection',
    icon: '🎙️',
    desc: 'Voice/context stress estimation for proactive risk scoring',
    color: '252, 178, 142',
  },
  {
    title: 'Visibility Detector',
    icon: '🌤️',
    desc: 'Low-light, fog, and blur condition classification in real time',
    color: '142, 242, 252',
  },
  {
    title: 'Motion Detection',
    icon: '📡',
    desc: 'Motion engine status and in-vehicle motion alerting',
    color: '252, 142, 214',
  },
  {
    title: 'Kid Safety Detection',
    icon: '👶',
    desc: 'AI face age-detection to ensure child is supervised in the vehicle',
    color: '255, 200, 100',
  },
  {
    title: 'Road Classification',
    icon: '🛣',
    desc: 'Highway, urban, rural road type categorization',
    color: '215, 252, 142',
  },
  {
    title: 'Risk Engine',
    icon: '🧠',
    desc: 'Weighted risk aggregation from all detection modules',
    color: '252, 208, 142',
  },
  {
    title: 'Real-Time Dashboard',
    icon: '📡',
    desc: 'WebSocket-powered live risk updates to frontend',
    color: '204, 142, 252',
  },
];

export default function Dashboard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/status`);
        const data = await resp.json();
        setStatus(data);
      } catch {
        setStatus(null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const systemOnline = status?.status === 'online';
  const drowsinessActive = status?.modules?.drowsiness?.active ?? false;
  const fogActive = status?.modules?.fog?.active ?? false;
  const stressActive = status?.modules?.stress?.active ?? false;
  const visibilityActive = status?.modules?.visibility?.active ?? false;
  const motionActive = status?.modules?.motion_detection?.active ?? false;
  const kidSafetyActive = status?.modules?.kid_safety?.active ?? false;
  const uptime = status?.uptime ?? 0;
  const activeModules =
    (drowsinessActive ? 1 : 0)
    + (fogActive ? 1 : 0)
    + (stressActive ? 1 : 0)
    + (visibilityActive ? 1 : 0)
    + (motionActive ? 1 : 0)
    + (kidSafetyActive ? 1 : 0);

  const stats = [
    {
      label: 'Active Modules',
      value: status ? `${activeModules} / 7` : '—',
      change: systemOnline ? 'System online' : 'Offline',
      positive: systemOnline,
    },
    {
      label: 'Risk Level',
      value: status?.risk_level?.toUpperCase() ?? '—',
      change: `Score: ${status?.risk_score ?? 0}`,
      positive: (status?.risk_score ?? 0) < 50,
    },
    {
      label: 'System Uptime',
      value: status ? `${Math.floor(status.uptime / 60)}m` : '—',
      change: status ? 'Running' : 'Stopped',
      positive: !!status,
    },
  ];

  return (
    <div className="page-wrapper dashboard-page">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>AI-based Driver Safety Risk Prediction — Real-time monitoring</p>
      </div>

      <div className="stats-row">
        {stats.map((s, i) => (
          <div className="stat-box" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.positive ? 'positive' : 'negative'}`}>
              {s.change}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-showcase">
        <div className="overview-flip-card" role="button" aria-label="Project overview card">
          <div className="overview-flip-card-inner">
            <div className="overview-flip-card-front">
              <p className="overview-title">Project Overview Hover Me</p>
              <p>Hover Me</p>
            </div>
            <div className="overview-flip-card-back">
              <p className="overview-title">BACK</p>
              <p>Leave Me</p>
            </div>
          </div>
        </div>

        <div className="project-code-card">
          <div className="project-code-titlebar">
            <span className="project-code-buttons">
              <button className="project-minimize" aria-label="Minimize">
                <svg viewBox="0 0 10.2 1">
                  <rect x="0" y="50%" width="10.2" height="1"></rect>
                </svg>
              </button>
              <button className="project-maximize" aria-label="Maximize">
                <svg viewBox="0 0 10 10">
                  <path d="M0,0v10h10V0H0z M9,9H1V1h8V9z"></path>
                </svg>
              </button>
              <button className="project-close" aria-label="Close">
                <svg viewBox="0 0 10 10">
                  <polygon points="10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1"></polygon>
                </svg>
              </button>
            </span>
          </div>

          <div className="project-code-body">
            <pre>
              <code>
                <span className="pc-comment">// Project Info</span>{'\n\n'}
                <span className="pc-key">Team:</span> <span className="pc-value">Mini Project Team 10</span>
                <span className="pc-semi">;</span>{'\n\n'}
                <span className="pc-key">Made by:</span>{'\n'}
                <span className="pc-value">Aman Kushwah</span> <span className="pc-op">&amp;</span>{' '}
                <span className="pc-value">Uday Kushwah</span><span className="pc-semi">;</span>{'\n\n'}
                <span className="pc-comment">// Quote</span>{'\n\n'}
                <span className="pc-quote">"Code is not just logic, it&apos;s creativity turned into reality."</span>
                {'\n\n'}
                <span className="pc-note">// Keep Building</span>
              </code>
            </pre>
          </div>
        </div>
      </div>

      <div className="hero-robot">
        <iframe
          src="https://my.spline.design/nexbotrobotcharacterconcept-7ICIxCNdXljLTvR22p8TEpNA/"
          frameBorder="0"
          width="100%"
          height="500"
          title="Nexbot Robot Assistant"
          loading="lazy"
        />
      </div>

      <div className="spline-container">
        <iframe
          src="https://my.spline.design/webdiagram-jDuKyuTJdw84DppJjkS7IrlS/"
          frameBorder="0"
          width="100%"
          height="600"
          title="System Workflow Diagram"
          loading="lazy"
        />
      </div>

      <div className="dashboard-cards-section">
        <h2>System Modules</h2>
        <div className="rotating-wrapper">
          <div
            className="rotating-inner"
            style={{ '--quantity': cards.length }}
          >
            {cards.map((card, index) => (
              <div
                className="rotating-card"
                key={index}
                style={{
                  '--index': index,
                  '--color-card': card.color,
                }}
              >
                <div className="rotating-card-bg">
                  <span className="card-icon">{card.icon}</span>
                  <span className="card-title">{card.title}</span>
                  <span className="card-desc">{card.desc}</span>
                  <div className="card-glow"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
