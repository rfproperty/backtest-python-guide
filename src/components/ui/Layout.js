import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { ADMIN_EMAIL } from '../config';
export default function Layout({ user, onLogout, children }) {
    return (_jsxs("div", { style: { width: '100%', maxWidth: 640, padding: '48px 32px' }, children: [_jsxs("header", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 32
                }, children: [_jsx(Link, { to: "/", style: { textDecoration: 'none', color: '#111827', fontSize: 24, fontWeight: 600 }, children: "BacktestAI" }), _jsxs("nav", { style: { display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }, children: [_jsx(Link, { to: "/pricing", style: { color: '#111827', textDecoration: 'none', fontWeight: 500 }, children: "Pricing" }), _jsx(Link, { to: "/contact", style: { color: '#111827', textDecoration: 'none', fontWeight: 500 }, children: "Contact" }), user ? (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/dashboard", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 }, children: "Dashboard" }), _jsx(Link, { to: "/account", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 }, children: "Account" }), user.email.toLowerCase() === ADMIN_EMAIL && (_jsx(Link, { to: "/admin/train_ai", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 }, children: "Admin AI" })), _jsx("span", { style: { color: '#4b5563' }, children: user.email }), _jsx("button", { onClick: onLogout, style: {
                                            border: 'none',
                                            background: '#ef4444',
                                            color: '#fff',
                                            padding: '8px 14px',
                                            borderRadius: 8,
                                            cursor: 'pointer'
                                        }, children: "Log out" })] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", style: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 }, children: "Login" }), _jsx(Link, { to: "/signup", style: {
                                            color: '#fff',
                                            background: '#2563eb',
                                            textDecoration: 'none',
                                            padding: '8px 14px',
                                            borderRadius: 8,
                                            fontWeight: 500
                                        }, children: "Sign up" })] }))] })] }), _jsx("main", { style: {
                    background: '#fff',
                    padding: '32px',
                    borderRadius: 16,
                    boxShadow: '0 25px 50px -12px rgba(30, 64, 175, 0.15)'
                }, children: children })] }));
}
