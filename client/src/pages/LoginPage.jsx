import { useState, useEffect } from 'react';
import ShowcasePanel from '../components/ShowcasePanel';

export default function LoginPage({ onLogin, onSwitchToRegister, loading }) {
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }
    setSubmitting(true);
    try {
      await onLogin({ username: username.trim(), password });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    const apiOrigin = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const w = 500, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(`${apiOrigin}/api/auth/google`, 'oauth', `width=${w},height=${h},left=${left},top=${top}`);
    const onMsg = (ev) => {
      if (ev.origin !== apiOrigin) return;
      if (ev.data?.type === 'oauth-success' && ev.data?.token) {
        localStorage.setItem('token', ev.data.token);
        window.removeEventListener('message', onMsg);
        try { popup?.close(); } catch {}
        window.location.reload();
      } else if (ev.data?.type === 'oauth-error') {
        setError(ev.data.message || 'Đăng nhập Google thất bại');
        window.removeEventListener('message', onMsg);
      }
    };
    window.addEventListener('message', onMsg);
  };

  return (
    <div style={{ ...styles.wrapper, flexDirection: 'column', padding: 20, alignItems: 'center', justifyContent: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100vh', padding: '40px 0' }}>
      <div style={styles.card}>
        <div style={styles.logo}>// GAMEMATCHING_v1.0</div>
        <h2 style={styles.title}>LOG IN</h2>
        <p style={styles.subtitle}>&gt; Xác thực danh tính để kết nối</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Tài khoản</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            style={styles.input}
            autoFocus
            disabled={submitting || loading}
          />

          <label style={styles.label}>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={styles.input}
            disabled={submitting || loading}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{ ...styles.button, opacity: submitting ? 0.6 : 1 }}
            disabled={submitting || loading}
          >
            {submitting ? 'Đang đăng nhập…' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <div style={{ margin: '18px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: NEON.border }} />
          <span style={{ color: NEON.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>HOẶC</span>
          <div style={{ flex: 1, height: 1, background: NEON.border }} />
        </div>

        <button type="button" onClick={handleGoogle}
          style={{
            marginTop: 14, padding: '12px', background: '#fff', border: 'none', borderRadius: 6,
            color: '#333', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.5 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6c1.8-5.5 7-9.7 13.6-9.7z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.5 2.9-2.2 5.3-4.7 6.9l7.5 5.8c4.4-4 6.9-10 6.9-17z"/><path fill="#FBBC05" d="M10.4 28.8a14.5 14.5 0 010-9.6l-7.8-6a24 24 0 000 21.6l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.5 0-12-4.4-13.9-10.3l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
          Tiếp tục với Google
        </button>

        <div style={styles.switch}>
          Chưa có tài khoản?{' '}
          <span style={styles.link} onClick={onSwitchToRegister}>
            Đăng ký ngay
          </span>
        </div>
      </div>
      </div>
      <div style={{ width: '100%', maxWidth: 1400, marginTop: -20, marginBottom: 40, borderTop: `1px solid ${NEON.border}`, paddingTop: 28 }}>
        <ShowcasePanel />
      </div>
    </div>
  );
}

const NEON = {
  bg: 'linear-gradient(135deg, #0a0614 0%, #130a24 45%, #1a0f2e 100%)',
  card: 'linear-gradient(135deg, #1e1333, #17102a)',
  cyan: '#22d3ee',
  magenta: '#a855f7',
  text: '#e2e8f0',
  sub: '#94a3b8',
  muted: '#64748b',
  border: '#2d1b4e',
  inputBg: '#0a0614',
  danger: '#f43f5e',
  dangerBg: '#2a0a14'
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: NEON.bg,
    fontFamily: "'Inter', sans-serif",
    padding: 20,
    position: 'relative',
    backgroundImage: `${NEON.bg}, url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0V60' fill='none' stroke='%2322d3ee' stroke-width='.4' stroke-opacity='.15'/%3E%3C/svg%3E")`
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '44px 38px',
    background: NEON.card,
    border: `1px solid ${NEON.cyan}40`,
    borderRadius: 8,
    boxShadow: `0 0 30px ${NEON.cyan}18, 0 0 60px ${NEON.magenta}12, inset 0 0 18px ${NEON.cyan}08`,
    backdropFilter: 'blur(10px)',
    position: 'relative'
  },
  logo: {
    textAlign: 'center',
    color: NEON.cyan,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: 6,
    marginBottom: 8,
    fontWeight: 700,
    textShadow: `0 0 6px ${NEON.cyan}50`
  },
  title: {
    textAlign: 'center',
    color: NEON.text,
    fontSize: 30,
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontWeight: 900,
    letterSpacing: 3,
    margin: '14px 0 4px',
    textTransform: 'uppercase',
    background: `linear-gradient(180deg, #ffffff, ${NEON.cyan}, ${NEON.magenta})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: `drop-shadow(0 0 10px ${NEON.cyan}40) drop-shadow(0 0 24px ${NEON.magenta}20)`
  },
  subtitle: {
    textAlign: 'center',
    color: NEON.sub,
    fontSize: 12,
    margin: '0 0 28px',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1
  },
  form: { display: 'flex', flexDirection: 'column' },
  label: {
    color: NEON.cyan,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700
  },
  input: {
    padding: '12px 14px',
    background: NEON.inputBg,
    border: `1px solid ${NEON.border}`,
    borderRadius: 4,
    color: NEON.text,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    fontFamily: "'JetBrains Mono', monospace"
  },
  error: {
    marginTop: 14,
    padding: '10px 14px',
    background: NEON.dangerBg,
    border: `1px solid ${NEON.danger}80`,
    borderRadius: 4,
    color: NEON.danger,
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  button: {
    marginTop: 22,
    padding: '14px',
    background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.magenta})`,
    border: 'none',
    borderRadius: 6,
    color: '#0a0614',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2,
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    boxShadow: `0 0 16px ${NEON.cyan}30, 0 0 32px ${NEON.magenta}18`
  },
  switch: {
    marginTop: 22,
    textAlign: 'center',
    color: NEON.muted,
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  link: {
    color: NEON.cyan,
    cursor: 'pointer',
    textDecoration: 'underline',
    textShadow: `0 0 4px ${NEON.cyan}40`
  }
};
