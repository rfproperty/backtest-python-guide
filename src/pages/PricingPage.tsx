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
    return <div className="text-muted-foreground text-center py-8">Loading pricing…</div>;
  }

  if (error) {
    return <div className="text-destructive text-center py-8">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Pricing that scales with you</h1>
        <p className="mt-2 text-muted-foreground">Start free. Upgrade for intraday data, exports, and higher limits.</p>
      </header>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription.toLowerCase() === plan.id.toLowerCase();
          const isFree = plan.id === 'free';
          const isPro = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';

          return (
            <div
              key={plan.id}
              className={`bg-card rounded-2xl border p-6 transition-all hover:shadow-lg ${
                plan.is_popular
                  ? 'border-primary shadow-glow scale-105'
                  : 'border-border'
              }`}
            >
              {plan.is_popular && (
                <span className="inline-block bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Most popular
                </span>
              )}
              <div className="flex justify-between items-baseline">
                <h2 className="text-2xl font-bold text-foreground">{plan.name}</h2>
                {plan.price > 0 ? (
                  <div className="text-3xl font-bold text-foreground">
                    ${plan.price}
                    <span className="text-sm text-muted-foreground font-medium">/mo</span>
                  </div>
                ) : (
                  <div className="text-xl font-semibold text-foreground">
                    {isEnterprise ? 'Custom' : '$0/mo'}
                  </div>
                )}
              </div>
              <p className="mt-3 text-muted-foreground min-h-[3rem]">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isEnterprise ? (
                  <button
                    type="button"
                    onClick={() => window.open('mailto:hello@backtest.ai', '_blank')}
                    className="w-full px-4 py-3 rounded-xl border border-primary bg-primary-light text-primary font-semibold hover:bg-primary/10 transition-all"
                  >
                    Contact sales
                  </button>
                ) : isFree ? (
                  <button
                    type="button"
                    onClick={() => (user ? navigate('/dashboard') : navigate('/signup'))}
                    className="w-full px-4 py-3 rounded-xl border border-primary bg-primary-light text-primary font-semibold hover:bg-primary/10 transition-all"
                  >
                    {user ? 'Go to dashboard' : 'Start for free'}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    className="w-full px-4 py-3 rounded-xl border border-success bg-success-light text-success-foreground font-semibold hover:bg-success/10 transition-all"
                  >
                    Manage billing
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={processing}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all disabled:opacity-70"
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
        <div className="text-destructive text-center font-semibold">{actionMessage}</div>
      )}
    </div>
  );
}
