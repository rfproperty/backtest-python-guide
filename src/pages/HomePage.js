import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function HomePage({ user }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("section", { children: [_jsx("h1", { style: { fontSize: 32, margin: '0 0 12px 0', color: '#1f2937' }, children: "Welcome to BacktestAI" }), _jsx("p", { style: { margin: 0, color: '#4b5563', lineHeight: 1.6 }, children: user
                            ? `You are logged in as ${user.email}.`
                            : 'Sign up or log in to access your backtesting workspace.' })] }), _jsxs("section", { style: {
                    display: 'grid',
                    gap: 16,
                    padding: 24,
                    borderRadius: 12,
                    background: '#f1f5f9'
                }, children: [_jsx("h2", { style: { margin: 0, fontSize: 20, color: '#1f2937' }, children: "Getting started" }), _jsxs("ul", { style: { margin: 0, paddingLeft: 18, color: '#4b5563', lineHeight: 1.6 }, children: [_jsx("li", { children: "Create an account via the sign-up page." }), _jsx("li", { children: "Log in to confirm your credentials." }), _jsx("li", { children: "Explore the dashboard once authentication succeeds." })] })] })] }));
}
