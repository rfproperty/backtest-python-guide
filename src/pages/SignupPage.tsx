import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../api/client';
import type { User } from '../types';

interface SignupPageProps {
  onSuccess: (user: User) => void;
}

export default function SignupPage({ onSuccess }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = await signup(email.toLowerCase(), password);
      onSuccess(user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to sign up.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, color: '#1f2937' }}>Create an account</h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Join BacktestAI to start building backtests.</p>
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
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
          background: '#22c55e',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Creating…' : 'Create account'}
      </button>
      <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
