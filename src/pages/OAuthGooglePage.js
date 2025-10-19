import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGoogleToken } from '../api/client';
export default function OAuthGooglePage({ onSuccess }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
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
        return _jsx("div", { style: { color: '#6b7280' }, children: "Signing you in\u2026" });
    }
    return (_jsxs("div", { style: { color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("span", { children: error ?? 'Failed to complete Google login.' }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: {
                    alignSelf: 'flex-start',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    cursor: 'pointer'
                }, children: "Back to login" })] }));
}
