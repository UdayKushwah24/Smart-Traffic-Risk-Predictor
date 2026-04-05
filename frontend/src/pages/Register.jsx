import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBg from '../components/ParticlesBg';
import '../styles/global.css';
import '../styles/login.css';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        setError(data.detail || data.error || 'Registration failed. Please try again.');
        return;
      }

      // Auto-login after registration
      const loginResp = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const loginData = await loginResp.json();
      if (loginResp.ok && loginData.access_token) {
        localStorage.setItem('auth_token', loginData.access_token);
        localStorage.setItem('auth_user', JSON.stringify(loginData.user));
        onLogin(loginData.user);
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="auth-page">
      <ParticlesBg />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">DS</div>
          <div className="auth-logo-text">
            <h2>AI-Based Driver Safety</h2>
            <span>Risk Prediction System</span>
          </div>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register to start monitoring driver safety</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          <div className="auth-field">
            <label htmlFor="reg-name">Full Name</label>
            <div className="auth-input-wrap">
              <input
                id="reg-name"
                type="text"
                className="auth-input"
                placeholder="Your full name"
                value={form.name}
                onChange={set('name')}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
              <span className="auth-input-icon">👤</span>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email Address</label>
            <div className="auth-input-wrap">
              <input
                id="reg-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
              <span className="auth-input-icon">✉</span>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
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
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            Already have an account?{' '}
            <button className="auth-link" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
