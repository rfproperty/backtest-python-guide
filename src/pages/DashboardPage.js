import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBacktests } from '../api/client';
const STATUS_OPTIONS = [
    { label: 'All statuses', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' }
];
const EMPTY_SUMMARY = {
    latest_pnl: null,
    latest_win: null,
    latest_duration: null,
    count_total: 0,
    count_completed: 0,
    count_pending: 0,
    count_failed: 0
};
function formatPercent(value) {
    if (value === null || Number.isNaN(value)) {
        return '—';
    }
    return `${value.toFixed(2)}%`;
}
function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}
export default function DashboardPage({ user }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchData = useCallback(async (nextSearch = search, nextStatus = status) => {
        setLoading(true);
        setError(null);
        try {
            const response = await listBacktests(user.id, {
                q: nextSearch || undefined,
                status: nextStatus === 'all' ? undefined : nextStatus
            });
            setItems(response.items);
            setSummary(response.summary);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load backtests');
        }
        finally {
            setLoading(false);
        }
    }, [search, status, user.id]);
    useEffect(() => {
        void fetchData();
    }, [fetchData]);
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        await fetchData(search, status);
    }, [fetchData, search, status]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: 0, fontSize: 28, color: '#111827' }, children: "Your Backtests" }), _jsx("p", { style: { margin: '4px 0 0', color: '#6b7280' }, children: "Manage and monitor every run powered by Backtest AI." })] }), _jsx("button", { type: "button", style: {
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 18px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }, onClick: () => navigate('/submit_backtest'), children: "\uD83D\uDE80 New Backtest" })] }), _jsxs("section", { style: {
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
                }, children: [_jsxs("div", { style: { background: '#eff6ff', padding: 16, borderRadius: 12 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.8 }, children: "Latest Return" }), _jsx("p", { style: { margin: '12px 0 0', fontSize: 24, fontWeight: 700 }, children: formatPercent(summary.latest_pnl) })] }), _jsxs("div", { style: { background: '#ecfdf5', padding: 16, borderRadius: 12 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.8 }, children: "Latest Win Rate" }), _jsx("p", { style: { margin: '12px 0 0', fontSize: 24, fontWeight: 700 }, children: formatPercent(summary.latest_win) })] }), _jsxs("div", { style: { background: '#fef3c7', padding: 16, borderRadius: 12 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.8 }, children: "Active Backtests" }), _jsx("p", { style: { margin: '12px 0 0', fontSize: 24, fontWeight: 700 }, children: summary.count_total }), _jsxs("p", { style: { margin: '4px 0 0', color: '#92400e', fontSize: 12 }, children: [summary.count_completed, " completed \u00B7 ", summary.count_pending, " pending \u00B7 ", summary.count_failed, " failed"] })] })] }), _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }, children: [_jsx("input", { type: "text", placeholder: "Search by name", value: search, onChange: (event) => setSearch(event.target.value), style: {
                            flex: 1,
                            minWidth: 220,
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: '1px solid #d1d5db'
                        } }), _jsx("select", { value: status, onChange: (event) => setStatus(event.target.value), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }, children: STATUS_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { type: "submit", style: {
                            padding: '10px 16px',
                            background: '#111827',
                            color: '#fff',
                            borderRadius: 10,
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }, children: "Apply" })] }), loading ? (_jsx("div", { style: { padding: 32, textAlign: 'center', color: '#6b7280' }, children: "Loading backtests\u2026" })) : error ? (_jsx("div", { style: { padding: 16, borderRadius: 12, background: '#fee2e2', color: '#991b1b' }, children: error })) : items.length === 0 ? (_jsxs("div", { style: {
                    padding: 32,
                    border: '1px dashed #cbd5f5',
                    borderRadius: 16,
                    textAlign: 'center',
                    background: '#f8fafc'
                }, children: [_jsx("div", { style: { fontSize: 32, marginBottom: 8 }, children: "\uD83D\uDE80" }), _jsx("h2", { style: { margin: '0 0 8px', fontSize: 20, color: '#111827' }, children: "No backtests yet" }), _jsx("p", { style: { margin: 0, color: '#6b7280' }, children: "Kick off your first run in under a minute." }), _jsx("button", { type: "button", onClick: () => navigate('/submit_backtest'), style: {
                            marginTop: 16,
                            padding: '10px 18px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }, children: "Start Backtest" })] })) : (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { textAlign: 'left', color: '#6b7280', fontSize: 13 }, children: [_jsx("th", { style: { padding: '12px 16px' }, children: "Backtest" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Created" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Status" }), _jsx("th", { style: { padding: '12px 16px' }, children: "Results" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { style: { borderTop: '1px solid #e5e7eb' }, children: [_jsx("td", { style: { padding: '16px', fontWeight: 600, color: '#111827' }, children: item.backtest_name ?? `Backtest #${item.id}` }), _jsx("td", { style: { padding: '16px', color: '#4b5563' }, children: formatDate(item.created_at) }), _jsx("td", { style: { padding: '16px' }, children: _jsx("span", { style: {
                                                padding: '4px 10px',
                                                borderRadius: 999,
                                                background: item.status === 'completed'
                                                    ? '#dcfce7'
                                                    : item.status === 'failed'
                                                        ? '#fee2e2'
                                                        : '#e0e7ff',
                                                color: item.status === 'completed'
                                                    ? '#166534'
                                                    : item.status === 'failed'
                                                        ? '#b91c1c'
                                                        : '#312e81',
                                                fontWeight: 600,
                                                fontSize: 12,
                                                textTransform: 'capitalize'
                                            }, children: item.status }) }), _jsx("td", { style: { padding: '16px' }, children: item.status === 'completed' ? (_jsx("a", { href: `/backtests/${item.id}`, style: { color: '#2563eb', fontWeight: 600, textDecoration: 'none' }, children: "View results \u2192" })) : (_jsx("span", { style: { color: '#9ca3af' }, children: "Results unavailable" })) })] }, item.id))) })] }) }))] }));
}
