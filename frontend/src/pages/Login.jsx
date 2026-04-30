import { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;
import { useNavigate } from 'react-router-dom';
import ParticlesBg from '../components/ParticlesBg';
import RunnerLoader from '../components/RunnerLoader';
import '../styles/global.css';
import '../styles/login.css';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        setError(data.detail || data.error || 'Invalid email or password');
        return;
      }

      // Persist token
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      onLogin(data.user);
      navigate('/');
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <ParticlesBg />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">DS</div>
          <div className="auth-logo-text">
            <h2>AI-Based Driver Safety</h2>
            <span>Risk Prediction System</span>
          </div>
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to access your safety dashboard</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          {/* Email */}
          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <div className="auth-input-wrap">
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <span className="auth-input-icon">✉</span>
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            <button className="auth-link" onClick={() => navigate('/forgot-password')}>
              Forgot your password?
            </button>
          </span>
          <span>
            Don't have an account?{' '}
            <button className="auth-link" onClick={() => navigate('/register')}>
              Create one
            </button>
          </span>
        </div>

        {loading && (
          <div className="auth-loading-overlay" role="status" aria-live="polite" aria-label="Signing in">
            <RunnerLoader scale={0.46} />
          </div>
        )}
      </div>
    </div>
  );
}
