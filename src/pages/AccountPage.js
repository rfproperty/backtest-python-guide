import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBillingPortalSession, fetchAccount } from '../api/client';
export default function AccountPage({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [billingError, setBillingError] = useState(null);
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
        }
        catch (err) {
            setBillingError(err instanceof Error ? err.message : 'Unable to open billing portal');
        }
    }, [user.id]);
    if (loading) {
        return _jsx("div", { style: { color: '#6b7280' }, children: "Loading account\u2026" });
    }
    if (error) {
        return (_jsxs("div", { style: { color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("span", { children: error }), _jsx("button", { type: "button", onClick: () => navigate('/dashboard'), style: { alignSelf: 'flex-start', border: 'none', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }, children: "Back to dashboard" })] }));
    }
    if (!account) {
        return _jsx("div", { style: { color: '#6b7280' }, children: "Account details not available." });
    }
    const createdDate = new Date(account.created_at);
    const createdLabel = Number.isNaN(createdDate.getTime())
        ? account.created_at
        : createdDate.toLocaleString();
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("header", { children: [_jsx("h1", { style: { margin: 0, fontSize: 28, color: '#0f172a' }, children: "Your Account" }), _jsx("p", { style: { margin: '6px 0 0', color: '#64748b' }, children: "Manage your profile, subscription, and billing details." })] }), _jsxs("section", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }, children: [_jsx("h2", { style: { margin: '0 0 12px', fontSize: 18, color: '#1f2937' }, children: "Profile" }), _jsxs("p", { style: { margin: '6px 0', color: '#1f2937' }, children: [_jsx("strong", { children: "Email:" }), " ", account.email] }), _jsxs("p", { style: { margin: '6px 0', color: '#1f2937' }, children: [_jsx("strong", { children: "Joined:" }), " ", createdLabel] })] }), _jsxs("section", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }, children: [_jsx("h2", { style: { margin: '0 0 12px', fontSize: 18, color: '#1f2937' }, children: "Subscription" }), _jsxs("p", { style: { margin: '6px 0', color: '#1f2937' }, children: [_jsx("strong", { children: "Current plan:" }), ' ', _jsx("span", { style: { textTransform: 'capitalize' }, children: account.subscription })] }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }, children: [_jsx("button", { type: "button", onClick: () => navigate('/pricing'), style: {
                                    border: '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }, children: "View pricing" }), _jsx("button", { type: "button", onClick: handleManageBilling, style: {
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }, children: "Manage billing" })] }), billingError && (_jsx("p", { style: { marginTop: 10, color: '#b91c1c' }, children: billingError }))] }), _jsxs("section", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }, children: [_jsx("h2", { style: { margin: '0 0 12px', fontSize: 18, color: '#1f2937' }, children: "Security" }), _jsx("p", { style: { margin: '6px 0', color: '#6b7280' }, children: "Password management isn\u2019t built into BacktestAI yet. Reach out to support if you need help updating your credentials." })] })] }));
}
