import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBillingPortalSession, createCheckoutSession, fetchPricing } from '../api/client';
async function loadStripeScript() {
    if (document.querySelector('script[src="https://js.stripe.com/v3/"]')) {
        return;
    }
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Stripe.js'));
        document.body.appendChild(script);
    });
}
async function ensureStripeInstance(publishableKey) {
    await loadStripeScript();
    if (!window.Stripe) {
        throw new Error('Stripe.js failed to initialise');
    }
    return window.Stripe(publishableKey);
}
export default function PricingPage({ user }) {
    const navigate = useNavigate();
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [processing, setProcessing] = useState(false);
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
        }
        catch (err) {
            setActionMessage(err instanceof Error ? err.message : 'Failed to start checkout');
        }
        finally {
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
        }
        catch (err) {
            setActionMessage(err instanceof Error ? err.message : 'Unable to open billing portal');
        }
    }, [navigate, user]);
    if (loading) {
        return _jsx("div", { style: { color: '#6b7280' }, children: "Loading pricing\u2026" });
    }
    if (error) {
        return _jsx("div", { style: { color: '#b91c1c' }, children: error });
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 32 }, children: [_jsxs("header", { style: { textAlign: 'center' }, children: [_jsx("h1", { style: { margin: 0, fontSize: 32, color: '#0f172a' }, children: "Pricing that scales with you" }), _jsx("p", { style: { marginTop: 8, color: '#64748b' }, children: "Start free. Upgrade for intraday data, exports, and higher limits." })] }), _jsx("div", { style: {
                    display: 'grid',
                    gap: 20,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
                }, children: plans.map((plan) => {
                    const isCurrentPlan = currentSubscription.toLowerCase() === plan.id.toLowerCase();
                    const isFree = plan.id === 'free';
                    const isPro = plan.id === 'pro';
                    const isEnterprise = plan.id === 'enterprise';
                    return (_jsxs("div", { style: {
                            background: '#ffffff',
                            borderRadius: 20,
                            border: plan.is_popular ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            padding: 24,
                            boxShadow: plan.is_popular ? '0 20px 45px -20px rgba(37, 99, 235, 0.35)' : 'none'
                        }, children: [plan.is_popular && (_jsx("span", { style: {
                                    display: 'inline-block',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    marginBottom: 12
                                }, children: "Most popular" })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, children: [_jsx("h2", { style: { margin: 0, fontSize: 22, color: '#111827' }, children: plan.name }), plan.price > 0 ? (_jsxs("div", { style: { fontSize: 26, fontWeight: 700, color: '#111827' }, children: ["$", plan.price, _jsx("span", { style: { fontSize: 14, color: '#64748b', fontWeight: 500 }, children: "/mo" })] })) : (_jsx("div", { style: { fontSize: 20, fontWeight: 600, color: '#111827' }, children: isEnterprise ? 'Custom' : '$0/mo' }))] }), _jsx("p", { style: { marginTop: 10, color: '#4b5563', minHeight: 48 }, children: plan.description }), _jsx("ul", { style: { marginTop: 16, paddingLeft: 20, color: '#1f2937', lineHeight: 1.6 }, children: plan.features.map((feature) => (_jsx("li", { children: feature }, feature))) }), _jsx("div", { style: { marginTop: 20 }, children: isEnterprise ? (_jsx("button", { type: "button", onClick: () => window.open('mailto:hello@backtest.ai', '_blank'), style: {
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        border: '1px solid #cbd5f5',
                                        background: '#f8fafc',
                                        color: '#1d4ed8',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }, children: "Contact sales" })) : isFree ? (_jsx("button", { type: "button", onClick: () => (user ? navigate('/dashboard') : navigate('/signup')), style: {
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        border: '1px solid #cbd5f5',
                                        background: '#f8fafc',
                                        color: '#1d4ed8',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }, children: user ? 'Go to dashboard' : 'Start for free' })) : isCurrentPlan ? (_jsx("button", { type: "button", onClick: handleManageBilling, style: {
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        border: '1px solid #34d399',
                                        background: '#d1fae5',
                                        color: '#047857',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }, children: "Manage billing" })) : (_jsx("button", { type: "button", onClick: handleUpgrade, disabled: processing, style: {
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: '#2563eb',
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        opacity: processing ? 0.8 : 1
                                    }, children: "Upgrade to Pro" })) })] }, plan.id));
                }) }), actionMessage && (_jsx("div", { style: { color: '#b91c1c', textAlign: 'center' }, children: actionMessage }))] }));
}
