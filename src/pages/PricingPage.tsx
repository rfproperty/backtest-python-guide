import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createBillingPortalSession,
  createCheckoutSession,
  fetchPricing
} from '../api/client';
import type { PricingResponse, User } from '../types';

interface PricingPageProps {
  user: User | null;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => any;
  }
}

async function loadStripeScript(): Promise<void> {
  if (document.querySelector('script[src="https://js.stripe.com/v3/"]')) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.body.appendChild(script);
  });
}

async function ensureStripeInstance(publishableKey: string) {
  await loadStripeScript();
  if (!window.Stripe) {
    throw new Error('Stripe.js failed to initialise');
  }
  return window.Stripe(publishableKey);
}

export default function PricingPage({ user }: PricingPageProps) {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPricing(user?.id)
      .then((data) => {
        if (!cancelled) {
          setPricing(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pricing data');
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
  }, [user?.id]);

  const currentSubscription = pricing?.current_subscription ?? user?.subscription ?? 'free';

  const plans = useMemo(() => pricing?.plans ?? [], [pricing]);

  const handleUpgrade = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!pricing?.stripe_enabled || !pricing.publishable_key) {
      setActionMessage('Billing is not configured yet. Please contact support.');
      return;
    }
    try {
      setProcessing(true);
      setActionMessage(null);
      const session = await createCheckoutSession(user.id);
      const stripeInstance = await ensureStripeInstance(pricing.publishable_key);
      const { error: stripeError } = await stripeInstance.redirectToCheckout({ sessionId: session.session_id });
      if (stripeError) {
        throw new Error(stripeError.message || 'Stripe checkout failed to start');
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setProcessing(false);
    }
  }, [navigate, pricing, user]);

  const handleManageBilling = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const session = await createBillingPortalSession(user.id);
      window.location.href = session.url;
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to open billing portal');
    }
  }, [navigate, user]);

  if (loading) {
    return <div style={{ color: '#6b7280' }}>Loading pricing…</div>;
  }

  if (error) {
    return <div style={{ color: '#b91c1c' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 32, color: '#0f172a' }}>Pricing that scales with you</h1>
        <p style={{ marginTop: 8, color: '#64748b' }}>Start free. Upgrade for intraday data, exports, and higher limits.</p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
        }}
      >
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription.toLowerCase() === plan.id.toLowerCase();
          const isFree = plan.id === 'free';
          const isPro = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';

          return (
            <div
              key={plan.id}
              style={{
                background: '#ffffff',
                borderRadius: 20,
                border: plan.is_popular ? '2px solid #2563eb' : '1px solid #e2e8f0',
                padding: 24,
                boxShadow: plan.is_popular ? '0 20px 45px -20px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              {plan.is_popular && (
                <span
                  style={{
                    display: 'inline-block',
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    marginBottom: 12
                  }}
                >
                  Most popular
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ margin: 0, fontSize: 22, color: '#111827' }}>{plan.name}</h2>
                {plan.price > 0 ? (
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>
                    ${plan.price}
                    <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/mo</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>
                    {isEnterprise ? 'Custom' : '$0/mo'}
                  </div>
                )}
              </div>
              <p style={{ marginTop: 10, color: '#4b5563', minHeight: 48 }}>{plan.description}</p>
              <ul style={{ marginTop: 16, paddingLeft: 20, color: '#1f2937', lineHeight: 1.6 }}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div style={{ marginTop: 20 }}>
                {isEnterprise ? (
                  <button
                    type="button"
                    onClick={() => window.open('mailto:hello@backtest.ai', '_blank')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid #cbd5f5',
                      background: '#f8fafc',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Contact sales
                  </button>
                ) : isFree ? (
                  <button
                    type="button"
                    onClick={() => (user ? navigate('/dashboard') : navigate('/signup'))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid #cbd5f5',
                      background: '#f8fafc',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {user ? 'Go to dashboard' : 'Start for free'}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid #34d399',
                      background: '#d1fae5',
                      color: '#047857',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Manage billing
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={processing}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#2563eb',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: processing ? 0.8 : 1
                    }}
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {actionMessage && (
        <div style={{ color: '#b91c1c', textAlign: 'center' }}>{actionMessage}</div>
      )}
    </div>
  );
}
