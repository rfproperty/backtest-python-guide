import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, login } from '../api/client';
export default function LoginPage({ onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleGoogleLogin = () => {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const user = await login(email.toLowerCase(), password);
            onSuccess(user);
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unable to login.');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: 0, fontSize: 28, color: '#1f2937' }, children: "Log in" }), _jsx("p", { style: { margin: '8px 0 0', color: '#6b7280' }, children: "Access your BacktestAI account." })] }), _jsxs("button", { type: "button", onClick: handleGoogleLogin, style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer'
                }, children: [_jsx("img", { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", alt: "Google logo", style: { width: 18, height: 18 } }), "Continue with Google"] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { flex: 1, height: 1, background: '#e5e7eb' } }), _jsx("span", { style: { color: '#6b7280', fontSize: 12 }, children: "or" }), _jsx("div", { style: { flex: 1, height: 1, background: '#e5e7eb' } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }, children: ["Email", _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true, style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5f5',
                            fontSize: 14
                        } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }, children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true, style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5f5',
                            fontSize: 14
                        } })] }), error && (_jsx("p", { style: { color: '#dc2626', margin: 0, fontSize: 14 }, children: error })), _jsx("button", { type: "submit", disabled: loading, style: {
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                }, children: loading ? 'Signing in…' : 'Log in' }), _jsxs("p", { style: { fontSize: 14, color: '#4b5563', margin: 0 }, children: ["No account yet?", ' ', _jsx(Link, { to: "/signup", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 600 }, children: "Create one" })] })] }));
}
