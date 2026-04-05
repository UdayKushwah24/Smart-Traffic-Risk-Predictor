import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ParticlesBg from './components/ParticlesBg';
import FloatingChatbot from './components/FloatingChatbot';
import Dashboard from './pages/Dashboard';
import LiveRisk from './pages/LiveRisk';
import Analytics from './pages/Analytics';
import AlertHistory from './pages/AlertHistory';
import ModelUpload from './pages/ModelUpload';
import Settings from './pages/Settings';
import AccidentPrediction from './pages/AccidentPrediction';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import './styles/global.css';

// ── Protected Route wrapper ──────────────────────────────────────────
function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Authenticated shell (sidebar + content) ──────────────────────────
function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <ParticlesBg />

      <button
        className="sidebar-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <Router>
      <FloatingChatbot />

      <Routes>
        {/* ── Public auth routes ─────────────────────────── */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <Register onLogin={handleLogin} />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* ── Protected dashboard routes ──────────────────── */}
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/live-risk" element={<LiveRisk />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/alerts" element={<AlertHistory />} />
                  <Route path="/upload" element={<ModelUpload />} />
                  <Route path="/accident" element={<AccidentPrediction />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
