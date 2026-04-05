import { useState } from 'react';
import '../styles/settings.css';

function FuturisticInput({ topLabel, bottomLabel, placeholder, value, onChange }) {
  return (
    <div className="futuristic-input">
      <div className="futuristic-input-space">
        <div className="futuristic-input-space-2"></div>
        <div className="triangle-input-up"></div>
        <div className="triangle-input-bar2"></div>
        <div className="triangle-input-left"></div>
        <div className="futuristic-input-space-2"></div>
        <div className="triangle-input-right2"></div>
        <div className="triangle-input-bar3"></div>
      </div>
      <div className="futuristic-input-space">
        <div className="triangle-input-up"></div>
        <div className="triangle-input-bar"></div>
      </div>
      <div className="futuristic-input-space">
        <div className="triangle-input-bar"></div>
        <input
          type="text"
          className="fi-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <p className="futuristic-input-enter">{topLabel}</p>
        <p className="futuristic-input-name">{bottomLabel}</p>
      </div>
      <div className="futuristic-input-space">
        <div className="triangle-input-bar"></div>
      </div>
      <div className="futuristic-input-space">
        <div className="triangle-input-bar"></div>
        <div className="triangle-input-down"></div>
      </div>
      <div className="futuristic-input-space2">
        <div className="triangle-input-bar3"></div>
        <div className="triangle-input-left2"></div>
        <div className="futuristic-input-space-2"></div>
        <div className="triangle-input-right"></div>
        <div className="triangle-input-bar2"></div>
        <div className="triangle-input-down"></div>
        <div className="futuristic-input-space-2"></div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [threshold, setThreshold] = useState('');
  const [alertLevel, setAlertLevel] = useState('');

  const [toggles, setToggles] = useState({
    notifications: true,
    autoRefresh: true,
    darkMode: true,
    soundAlerts: false,
  });

  const handleToggle = (key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page-wrapper settings-page">
      <div className="page-header">
        <h1>Settings & Configuration</h1>
        <p>Configure system parameters, API keys, and alert thresholds</p>
      </div>

      <div className="settings-grid">
        {/* API Configuration */}
        <div className="settings-section">
          <h3>
            <span className="section-icon">🔑</span>
            API Configuration
          </h3>

          <div className="futuristic-input-wrapper">
            <span className="input-label">API Key</span>
            <FuturisticInput
              topLabel="ENTER"
              bottomLabel="API KEY"
              placeholder="Enter your API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="futuristic-input-wrapper">
            <span className="input-label">Risk Threshold</span>
            <FuturisticInput
              topLabel="SET"
              bottomLabel="THRESHOLD"
              placeholder="e.g. 0.75"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>

          <div className="futuristic-input-wrapper">
            <span className="input-label">Alert Level</span>
            <FuturisticInput
              topLabel="SET"
              bottomLabel="ALERT"
              placeholder="low / medium / high"
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value)}
            />
          </div>

          <button className="settings-save-btn">💾 Save Configuration</button>
        </div>

        {/* Preferences */}
        <div className="settings-section">
          <h3>
            <span className="section-icon">⚙</span>
            Preferences
          </h3>

          <div className="setting-toggle">
            <span className="setting-toggle-label">Push Notifications</span>
            <div
              className={`toggle-switch${toggles.notifications ? ' on' : ''}`}
              onClick={() => handleToggle('notifications')}
            >
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className="setting-toggle">
            <span className="setting-toggle-label">Auto-refresh Data</span>
            <div
              className={`toggle-switch${toggles.autoRefresh ? ' on' : ''}`}
              onClick={() => handleToggle('autoRefresh')}
            >
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className="setting-toggle">
            <span className="setting-toggle-label">Dark Mode</span>
            <div
              className={`toggle-switch${toggles.darkMode ? ' on' : ''}`}
              onClick={() => handleToggle('darkMode')}
            >
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className="setting-toggle">
            <span className="setting-toggle-label">Sound Alerts</span>
            <div
              className={`toggle-switch${toggles.soundAlerts ? ' on' : ''}`}
              onClick={() => handleToggle('soundAlerts')}
            >
              <div className="toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
