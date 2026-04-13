import { useState, useEffect } from 'react';
import ShowcasePanel from '../components/ShowcasePanel';

export default function RegisterPage({ onRegister, onSwitchToLogin, loading }) {
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Tên tài khoản và mật khẩu là bắt buộc');
      return;
    }
    if (username.trim().length < 3) {
      setError('Tên tài khoản tối thiểu 3 ký tự');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setSubmitting(true);
    try {
      await onRegister({
        username: username.trim(),
        email: email.trim() || undefined,
        password
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...styles.wrapper, flexDirection: 'column', padding: 20, alignItems: 'center', justifyContent: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100vh', padding: '40px 0' }}>
      <div style={styles.card}>
        <div style={styles.logo}>// GAMEMATCHING_v1.0</div>
        <h2 style={styles.title}>SIGN UP</h2>
        <p style={styles.subtitle}>&gt; Tạo tài khoản mới để kết nối</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Tên tài khoản *</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            style={styles.input}
            autoFocus
            disabled={submitting || loading}
          />

          <label style={styles.label}>Email (tùy chọn)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
            disabled={submitting || loading}
          />

          <label style={styles.label}>Mật khẩu *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            style={styles.input}
            disabled={submitting || loading}
          />

          <label style={styles.label}>Xác nhận mật khẩu *</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            style={styles.input}
            disabled={submitting || loading}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{ ...styles.button, opacity: submitting ? 0.6 : 1 }}
            disabled={submitting || loading}
          >
            {submitting ? 'Đang tạo tài khoản…' : 'ĐĂNG KÝ'}
          </button>
        </form>

        <div style={styles.switch}>
          Đã có tài khoản?{' '}
          <span style={styles.link} onClick={onSwitchToLogin}>
            Đăng nhập
          </span>
        </div>
      </div>
      </div>
      <div style={{ width: '100%', maxWidth: 1400, marginBottom: 40, paddingTop: 28 }}>
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
    position: 'relative'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '44px 38px',
    background: NEON.card,
    border: `1px solid ${NEON.magenta}40`,
    borderRadius: 8,
    boxShadow: `0 0 30px ${NEON.magenta}18, 0 0 60px ${NEON.cyan}12, inset 0 0 18px ${NEON.magenta}08`,
    backdropFilter: 'blur(10px)'
  },
  logo: {
    textAlign: 'center',
    color: NEON.magenta,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: 6,
    marginBottom: 8,
    fontWeight: 700,
    textShadow: `0 0 6px ${NEON.magenta}50`
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
    background: `linear-gradient(180deg, #ffffff, ${NEON.magenta}, ${NEON.cyan})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: `drop-shadow(0 0 10px ${NEON.magenta}40) drop-shadow(0 0 24px ${NEON.cyan}20)`
  },
  subtitle: {
    textAlign: 'center',
    color: NEON.sub,
    fontSize: 12,
    margin: '0 0 24px',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1
  },
  form: { display: 'flex', flexDirection: 'column' },
  label: {
    color: NEON.magenta,
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
    background: `linear-gradient(135deg, ${NEON.magenta}, ${NEON.cyan})`,
    border: 'none',
    borderRadius: 6,
    color: '#0a0614',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2,
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    boxShadow: `0 0 16px ${NEON.magenta}30, 0 0 32px ${NEON.cyan}18`
  },
  switch: {
    marginTop: 22,
    textAlign: 'center',
    color: NEON.muted,
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace"
  },
  link: {
    color: NEON.magenta,
    cursor: 'pointer',
    textDecoration: 'underline',
    textShadow: `0 0 4px ${NEON.magenta}40`
  }
};
