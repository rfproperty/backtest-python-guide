import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelCheckout } from '../api/client';
export default function CheckoutCancelPage() {
    const navigate = useNavigate();
    const [message, setMessage] = useState('Processing…');
    useEffect(() => {
        let cancelled = false;
        cancelCheckout()
            .then((res) => {
            if (!cancelled) {
                setMessage(res.message || 'Checkout cancelled.');
            }
        })
            .catch(() => {
            if (!cancelled) {
                setMessage('Checkout cancelled.');
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("h1", { style: { margin: 0, fontSize: 30, color: '#0f172a' }, children: "Checkout cancelled" }), _jsx("p", { style: { margin: 0, color: '#1f2937' }, children: message }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx("button", { type: "button", onClick: () => navigate('/pricing'), style: {
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            padding: '10px 16px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "View pricing" }), _jsx("button", { type: "button", onClick: () => navigate('/dashboard'), style: {
                            border: '1px solid #cbd5f5',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '10px 16px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "Back to dashboard" })] })] }));
}
