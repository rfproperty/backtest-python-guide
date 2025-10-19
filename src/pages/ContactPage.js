import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const INITIAL_FORM = {
    name: '',
    email: '',
    message: ''
};
export default function ContactPage({ user }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: user?.email?.split('@')[0] ?? '',
        email: user?.email ?? '',
        message: ''
    });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('submitting');
        setError(null);
        try {
            const response = await fetch('https://formspree.io/f/mqkrnela', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!response.ok) {
                throw new Error('Failed to send message.');
            }
            setStatus('success');
            setForm(INITIAL_FORM);
        }
        catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
    };
    return (_jsxs("div", { style: { maxWidth: 640, margin: '48px auto', background: '#f9fafb', borderRadius: 20, padding: 32 }, children: [_jsx("h1", { style: { fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 12 }, children: "Contact Us" }), _jsx("p", { style: { color: '#4b5563', marginBottom: 24 }, children: "Have questions about BacktestAI? Leave us a message and we\u2019ll get back to you in one business day." }), _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, htmlFor: "name", children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600, color: '#1f2937' }, children: "Your Name" }), _jsx("input", { id: "name", name: "name", type: "text", required: true, value: form.name, onChange: handleChange, style: {
                                    borderRadius: 12,
                                    border: '1px solid #d1d5db',
                                    padding: '10px 14px',
                                    fontSize: 15
                                } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, htmlFor: "email", children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600, color: '#1f2937' }, children: "Email" }), _jsx("input", { id: "email", name: "email", type: "email", required: true, value: form.email, onChange: handleChange, style: {
                                    borderRadius: 12,
                                    border: '1px solid #d1d5db',
                                    padding: '10px 14px',
                                    fontSize: 15
                                } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, htmlFor: "message", children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600, color: '#1f2937' }, children: "Message" }), _jsx("textarea", { id: "message", name: "message", rows: 5, required: true, value: form.message, onChange: handleChange, style: {
                                    borderRadius: 12,
                                    border: '1px solid #d1d5db',
                                    padding: '10px 14px',
                                    fontSize: 15,
                                    resize: 'vertical'
                                } })] }), _jsx("button", { type: "submit", disabled: status === 'submitting', style: {
                            border: 'none',
                            borderRadius: 12,
                            background: '#2563eb',
                            color: '#fff',
                            padding: '12px 16px',
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }, children: status === 'submitting' ? 'Sending…' : 'Send message' })] }), status === 'success' && (_jsx("p", { style: { marginTop: 16, color: '#047857', fontWeight: 600 }, children: "Thanks! We received your message." })), status === 'error' && error && (_jsx("p", { style: { marginTop: 16, color: '#b91c1c', fontWeight: 600 }, children: error }))] }));
}
