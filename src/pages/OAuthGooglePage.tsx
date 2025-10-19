import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGoogleToken } from '../api/client';
import type { User } from '../types';

interface OAuthGooglePageProps {
  onSuccess: (user: User) => void;
}

export default function OAuthGooglePage({ onSuccess }: OAuthGooglePageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('Missing login token. Please try signing in again.');
      return;
    }

    exchangeGoogleToken(token)
      .then((user) => {
        onSuccess(user);
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to complete Google login.');
      });
  }, [navigate, onSuccess, searchParams]);

  if (status === 'loading') {
    return <div style={{ color: '#6b7280' }}>Signing you in…</div>;
  }

  return (
    <div style={{ color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span>{error ?? 'Failed to complete Google login.'}</span>
      <button
        type="button"
        onClick={() => navigate('/login')}
        style={{
          alignSelf: 'flex-start',
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        Back to login
      </button>
    </div>
  );
}
