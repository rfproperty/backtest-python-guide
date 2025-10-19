import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, login } from '../api/client';
import type { User } from '../types';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.toLowerCase(), password);
      onSuccess(user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, color: '#1f2937' }}>Log in</h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Access your BacktestAI account.</p>
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          background: '#ffffff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          style={{ width: 18, height: 18 }}
        />
        Continue with Google
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{ color: '#6b7280', fontSize: 12 }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5f5',
            fontSize: 14
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5f5',
            fontSize: 14
          }}
        />
      </label>
      {error && (
        <p style={{ color: '#dc2626', margin: 0, fontSize: 14 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Signing in…' : 'Log in'}
      </button>
      <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>
        No account yet?{' '}
        <Link to="/signup" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          Create one
        </Link>
      </p>
    </form>
  );
}
