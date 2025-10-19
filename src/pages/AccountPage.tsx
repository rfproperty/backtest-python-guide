import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBillingPortalSession, fetchAccount } from '../api/client';
import type { AccountInfo, User } from '../types';

interface AccountPageProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export default function AccountPage({ user, onUserUpdate }: AccountPageProps) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAccount(user.id)
      .then((data) => {
        if (!cancelled) {
          setAccount(data);
          if (onUserUpdate && (user.subscription !== data.subscription)) {
            onUserUpdate({ ...user, subscription: data.subscription });
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load account information');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, onUserUpdate]);

  const handleManageBilling = useCallback(async () => {
    try {
      setBillingError(null);
      const response = await createBillingPortalSession(user.id);
      window.location.href = response.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Unable to open billing portal');
    }
  }, [user.id]);

  if (loading) {
    return <div style={{ color: '#6b7280' }}>Loading account…</div>;
  }

  if (error) {
    return (
      <div style={{ color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span>{error}</span>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{ alignSelf: 'flex-start', border: 'none', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!account) {
    return <div style={{ color: '#6b7280' }}>Account details not available.</div>;
  }

  const createdDate = new Date(account.created_at);
  const createdLabel = Number.isNaN(createdDate.getTime())
    ? account.created_at
    : createdDate.toLocaleString();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Your Account</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b' }}>Manage your profile, subscription, and billing details.</p>
      </header>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#1f2937' }}>Profile</h2>
        <p style={{ margin: '6px 0', color: '#1f2937' }}><strong>Email:</strong> {account.email}</p>
        <p style={{ margin: '6px 0', color: '#1f2937' }}><strong>Joined:</strong> {createdLabel}</p>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#1f2937' }}>Subscription</h2>
        <p style={{ margin: '6px 0', color: '#1f2937' }}>
          <strong>Current plan:</strong>{' '}
          <span style={{ textTransform: 'capitalize' }}>{account.subscription}</span>
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            style={{
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '10px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            View pricing
          </button>
          <button
            type="button"
            onClick={handleManageBilling}
            style={{
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Manage billing
          </button>
        </div>
        {billingError && (
          <p style={{ marginTop: 10, color: '#b91c1c' }}>{billingError}</p>
        )}
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#1f2937' }}>Security</h2>
        <p style={{ margin: '6px 0', color: '#6b7280' }}>
          Password management isn’t built into BacktestAI yet. Reach out to support if you need help updating your credentials.
        </p>
      </section>
    </div>
  );
}
