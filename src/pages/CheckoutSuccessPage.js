import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { completeCheckout, fetchAccount } from '../api/client';
export default function CheckoutSuccessPage({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [message, setMessage] = useState('Completing your subscription…');
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');
        completeCheckout(user.id, sessionId)
            .then(async (res) => {
            if (!cancelled) {
                setMessage(res.message || 'Subscription upgraded to Pro.');
            }
            if (onUserUpdate) {
                const account = await fetchAccount(user.id);
                onUserUpdate({ ...user, subscription: account.subscription });
            }
        })
            .catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to confirm checkout.');
            }
        });
        return () => {
            cancelled = true;
        };
    }, [location.search, onUserUpdate, user]);
    if (error) {
        return (_jsxs("div", { style: { color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("span", { children: error }), _jsx("button", { type: "button", onClick: () => navigate('/pricing'), style: { alignSelf: 'flex-start', border: 'none', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }, children: "Back to pricing" })] }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("h1", { style: { margin: 0, fontSize: 30, color: '#0f172a' }, children: "Thank you!" }), _jsx("p", { style: { margin: 0, color: '#1f2937' }, children: message }), _jsx("p", { style: { margin: 0, color: '#6b7280' }, children: "You can now run more backtests, unlock intraday data, and export your results. Manage your billing from the account section at any time." }), _jsxs("div", { style: { display: 'flex', gap: 12, marginTop: 8 }, children: [_jsx("button", { type: "button", onClick: () => navigate('/dashboard'), style: {
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            padding: '10px 16px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "Go to dashboard" }), _jsx("button", { type: "button", onClick: () => navigate('/account'), style: {
                            border: '1px solid #cbd5f5',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '10px 16px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "View account" })] })] }));
}
