import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBg from '../components/ParticlesBg';
import '../styles/global.css';
import '../styles/login.css';

// ── Step 1: Enter email ───────────────────────────
function EmailStep({ onNext }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (data.error) { setError(data.error); return; }

      // In dev mode the backend returns the OTP in the response
      onNext(email, data.dev_otp || null);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="auth-title">Forgot Password</h1>
      <p className="auth-subtitle">Enter your registered email to receive an OTP</p>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="fp-email">Email Address</label>
          <div className="auth-input-wrap">
            <input
              id="fp-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="auth-input-icon">✉</span>
          </div>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Sending OTP…' : 'Send OTP'}
        </button>
      </form>
    </>
  );
}

// ── Step 2: Enter OTP ─────────────────────────────
function OTPStep({ email, devOtp, onNext }) {
  const OTP_LEN = 6;
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    if (cleaned && idx < OTP_LEN - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (!pasted) return;
    const next = Array(OTP_LEN).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    refs.current[Math.min(pasted.length, OTP_LEN - 1)]?.focus();
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const otp_code = digits.join('');
    if (otp_code.length < OTP_LEN) { setError('Enter the 6-digit OTP'); return; }

    setLoading(true);
    try {
      const resp = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error || !data.valid) {
        setError(data.detail || data.error || 'Invalid or expired OTP');
        return;
      }
      onNext(otp_code);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="auth-title">Verify OTP</h1>
      <p className="auth-subtitle">
        Enter the 6-digit code sent to <strong>{email}</strong>
        {devOtp && (
          <span style={{ display: 'block', color: 'var(--accent-cyan)', marginTop: 6, fontSize: '0.8rem' }}>
            Dev mode — OTP: <strong>{devOtp}</strong>
          </span>
        )}
      </p>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              className={`otp-input${d ? ' filled' : ''}`}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify OTP'}
        </button>
      </form>
    </>
  );
}

// ── Step 3: New password ──────────────────────────
function ResetStep({ email, otpCode }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const resp = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode, new_password: password }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setError(data.detail || data.error || 'Could not reset password.');
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <h1 className="auth-title">Password Reset!</h1>
        <div className="auth-success" style={{ marginTop: 20 }}>
          Your password has been updated successfully. Redirecting to login…
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title">New Password</h1>
      <p className="auth-subtitle">Choose a strong password for your account</p>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label>New Password</label>
          <div className="auth-input-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              className="auth-input"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
            >
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label>Confirm Password</label>
          <div className="auth-input-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              className="auth-input"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

// ── Main multi-step component ─────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);  // 1=email, 2=otp, 3=reset
  const [email, setEmail] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [verifiedOtp, setVerifiedOtp] = useState('');

  const stepLabels = ['Email', 'OTP', 'Reset'];

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

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {stepLabels.map((label, i) => (
            <div
              key={label}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: step === i + 1
                  ? 'var(--accent-cyan)'
                  : step > i + 1
                    ? 'var(--text-secondary)'
                    : 'var(--text-muted)',
                borderBottom: `2px solid ${
                  step === i + 1
                    ? 'var(--accent-cyan)'
                    : step > i + 1
                      ? 'rgba(0,229,255,0.3)'
                      : 'var(--glass-border)'
                }`,
                paddingBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <EmailStep
            onNext={(em, otp) => {
              setEmail(em);
              setDevOtp(otp);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <OTPStep
            email={email}
            devOtp={devOtp}
            onNext={(otp) => {
              setVerifiedOtp(otp);
              setStep(3);
            }}
          />
        )}

        {step === 3 && <ResetStep email={email} otpCode={verifiedOtp} />}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          <button className="auth-link" onClick={() => navigate('/login')}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
