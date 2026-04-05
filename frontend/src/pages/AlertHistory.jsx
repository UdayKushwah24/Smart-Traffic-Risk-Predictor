import { useEffect, useState } from 'react';
import '../styles/alerthistory.css';

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch('/api/alerts', {
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
          setError(data.error || 'Unable to fetch alerts');
          return;
        }
        setAlerts(data.alerts || []);
      } catch {
        setError('Unable to fetch alerts');
      }
    };

    loadAlerts();
  }, []);

  return (
    <div className="page-wrapper alert-history-page">
      <div className="page-header">
        <h1>Alert History</h1>
        <p>AI-Based Driver Safety Risk Prediction System</p>
      </div>

      {error && <div className="alert-history-error">{error}</div>}

      <div className="alert-history-table-wrap">
        <table className="alert-history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Alert Type</th>
              <th>Severity</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-row">No alerts available</td>
              </tr>
            ) : (
              alerts.map((alert) => {
                const dt = new Date(alert.timestamp);
                return (
                  <tr key={alert.id}>
                    <td>{dt.toLocaleDateString()}</td>
                    <td>{alert.alert_type}</td>
                    <td className={`severity-${alert.severity}`}>{alert.severity}</td>
                    <td>{dt.toLocaleTimeString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
