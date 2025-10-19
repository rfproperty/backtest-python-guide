import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signup } from '../api/client';
export default function SignupPage({ onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
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
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unable to sign up.');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: 0, fontSize: 28, color: '#1f2937' }, children: "Create an account" }), _jsx("p", { style: { margin: '8px 0 0', color: '#6b7280' }, children: "Join BacktestAI to start building backtests." })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }, children: ["Email", _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true, style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5f5',
                            fontSize: 14
                        } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }, children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true, style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5f5',
                            fontSize: 14
                        } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }, children: ["Confirm password", _jsx("input", { type: "password", value: confirmPassword, onChange: (event) => setConfirmPassword(event.target.value), required: true, style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5f5',
                            fontSize: 14
                        } })] }), error && (_jsx("p", { style: { color: '#dc2626', margin: 0, fontSize: 14 }, children: error })), _jsx("button", { type: "submit", disabled: loading, style: {
                    border: 'none',
                    background: '#22c55e',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                }, children: loading ? 'Creating…' : 'Create account' }), _jsxs("p", { style: { fontSize: 14, color: '#4b5563', margin: 0 }, children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 600 }, children: "Sign in" })] })] }));
}
