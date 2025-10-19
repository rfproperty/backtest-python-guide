import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchBacktestDetail } from '../api/client';
const PRIORITY_COLUMNS = [
    'symbol',
    'entry_date',
    'position_status',
    'entry',
    'target',
    'stop',
    'length',
    'pnl'
];
const UNIT_SUFFIXES = {
    Average_Holding_Period: 'Candles'
};
const SPECIAL_LABELS = {
    final_pnl: 'Final PnL',
    Average_Profit_per_Trade: 'Average Profit per Trade'
};
const METRIC_GROUPS = [
    {
        group: 'Balances & Returns',
        keys: ['Initial_Balance', 'final_balance', 'Total_Return_Profit_%', 'final_pnl', 'Annualized_Return']
    },
    {
        group: 'Trade Stats',
        keys: [
            'Number_of_Trades',
            'Win_Rate',
            'Profit_Factor',
            'Risk_Reward_Ratio',
            'Average_Profit_per_Trade',
            'Recovery_Factor'
        ]
    },
    {
        group: 'Risk & Volatility',
        keys: ['Maximum_Drawdown', 'Sharpe_Ratio', 'Sortino_Ratio']
    },
    {
        group: 'Durations & Streaks',
        keys: ['Average_Holding_Period', 'Max_Win_Streak', 'Max_Loss_Streak']
    }
];
const HIDE_FROM_OTHER = new Set(['Equity_Curve', 'Trade_Duration_Distribution']);
const OTHER_EXCLUDE = new Set([
    'Total_Return_Profit_$',
    'Recovery_Factor',
    'Total_Return_Net_Profit',
    'Time_in_Market',
    'time_in_market',
    'Per_Trade_USD',
    'per_trade_usd',
    'CAGR',
    'Volatility',
    'Calmar_Ratio',
    'Expectancy',
    'Transaction_Costs',
    'transaction_costs',
    'Transaction_Cost',
    'transaction_cost',
    'Ulcer_Index',
    'ulcer_index'
]);
function formatCurrency(value) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2
        }).format(value);
    }
    catch (error) {
        console.warn('Currency formatting failed', error);
        return value.toFixed(2);
    }
}
function formatPercent(raw) {
    const scaled = Math.abs(raw) > 1 ? raw : raw * 100;
    return `${scaled.toFixed(2)}%`;
}
function formatNumber(raw) {
    const normalized = Math.abs(raw) < 1e-10 ? 0 : raw;
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 4,
        minimumFractionDigits: 0
    }).format(normalized);
}
function parseNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();
        if (!cleaned)
            return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function formatDateTime(value) {
    if (!value) {
        return null;
    }
    const text = String(value);
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
    }
    return text;
}
function formatDateLabel(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    }
    return value;
}
function formatHeadline(value, kind) {
    const num = parseNumber(value);
    if (num === null) {
        return { display: '—', tone: null };
    }
    if (kind === 'int') {
        return { display: Math.round(num).toLocaleString(), tone: null };
    }
    if (kind === 'currency') {
        return { display: formatCurrency(num), tone: num > 0 ? 'pos' : num < 0 ? 'neg' : null };
    }
    const percentText = formatPercent(num);
    return { display: percentText, tone: num > 0 ? 'pos' : num < 0 ? 'neg' : null };
}
function humanLabel(key) {
    return key.replace(/_/g, ' ');
}
function formatMetricValue(key, value) {
    if (value === null || value === undefined) {
        return { formatted: '—', negative: false };
    }
    if (typeof value === 'boolean') {
        return { formatted: value ? 'Yes' : 'No', negative: false };
    }
    const numeric = parseNumber(value);
    const lowerKey = key.toLowerCase();
    if (numeric === null) {
        return { formatted: String(value), negative: false };
    }
    if (key.includes('$') ||
        lowerKey.includes('usd') ||
        lowerKey.includes('balance') ||
        lowerKey.endsWith('_$') ||
        lowerKey.includes('profit_$') ||
        lowerKey === 'final_pnl' ||
        lowerKey === 'average_profit_per_trade') {
        return { formatted: formatCurrency(numeric), negative: numeric < 0 };
    }
    if (key.endsWith('_%') ||
        key.includes('%') ||
        lowerKey.includes('drawdown') ||
        lowerKey.includes('rate') ||
        lowerKey.includes('return')) {
        return { formatted: formatPercent(numeric), negative: numeric < 0 };
    }
    if (lowerKey === 'number_of_trades') {
        return { formatted: Math.round(numeric).toLocaleString(), negative: numeric < 0 };
    }
    return { formatted: formatNumber(numeric), negative: numeric < 0 };
}
function buildMetricGroups(summary) {
    const seen = new Set();
    const groups = [];
    for (const { group, keys } of METRIC_GROUPS) {
        const items = [];
        for (const key of keys) {
            if (!(key in summary)) {
                continue;
            }
            const { formatted, negative } = formatMetricValue(key, summary[key]);
            items.push({
                label: SPECIAL_LABELS[key] ?? humanLabel(key),
                value: formatted,
                negative,
                unit: UNIT_SUFFIXES[key]
            });
            seen.add(key);
        }
        if (items.length) {
            groups.push({ group, items });
        }
    }
    const extras = [];
    for (const [key, value] of Object.entries(summary)) {
        if (seen.has(key) || HIDE_FROM_OTHER.has(key) || OTHER_EXCLUDE.has(key)) {
            continue;
        }
        const { formatted, negative } = formatMetricValue(key, value);
        extras.push({
            label: SPECIAL_LABELS[key] ?? humanLabel(key),
            value: formatted,
            negative,
            unit: UNIT_SUFFIXES[key]
        });
    }
    if (extras.length) {
        groups.push({ group: 'Other', items: extras });
    }
    return groups;
}
function buildHeadlineMetrics(summary) {
    const trades = formatHeadline(summary['Number_of_Trades'] ?? summary['total_trades'], 'int');
    const profit = formatHeadline(summary['final_pnl'] ?? summary['Total_Return_Profit_$'] ?? summary['Profit_$'] ?? summary['Total_Return_$'], 'currency');
    const annualized = formatHeadline(summary['Annualized_Return'], 'percent');
    return [
        { label: 'Total trades', value: trades.display, tone: trades.tone },
        { label: 'Final PnL', value: profit.display, tone: profit.tone },
        { label: 'Annualized Return', value: annualized.display, tone: annualized.tone }
    ];
}
function formatTradeNumber(value) {
    const normalized = Math.abs(value) < 1e-10 ? 0 : value;
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 4,
        minimumFractionDigits: 0
    }).format(normalized);
}
function formatTradeCell(value) {
    if (value === null || value === undefined) {
        return '—';
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return String(value);
        }
        return formatTradeNumber(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return '—';
        }
        const maybeDate = new Date(trimmed);
        if (!Number.isNaN(maybeDate.getTime()) && (trimmed.includes('-') || trimmed.includes('/'))) {
            return maybeDate.toLocaleString();
        }
        const numeric = parseNumber(trimmed);
        if (numeric !== null) {
            return formatTradeNumber(numeric);
        }
        return trimmed;
    }
    return String(value);
}
function resolveTradeColumns(columns) {
    const lowerToOriginal = new Map(columns.map((col) => [col.toLowerCase(), col]));
    const resolved = PRIORITY_COLUMNS.map((key) => lowerToOriginal.get(key));
    return resolved.filter((col) => Boolean(col));
}
function SimpleLineChart({ values, color, fill }) {
    if (!values.length) {
        return _jsx("div", { style: { color: '#6b7280', textAlign: 'center', padding: 24 }, children: "No data" });
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const polygonPoints = [`0,100`, ...points, `100,100`].join(' ');
    return (_jsxs("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { width: '100%', height: 200 }, children: [fill && _jsx("polygon", { points: polygonPoints, fill: fill, opacity: 0.25 }), _jsx("polyline", { points: points.join(' '), stroke: color, strokeWidth: 2.5, fill: "none" })] }));
}
function SimpleBarChart({ labels, values }) {
    if (!values.length) {
        return _jsx("div", { style: { color: '#6b7280', textAlign: 'center', padding: 24 }, children: "No data" });
    }
    const max = Math.max(...values) || 1;
    return (_jsx("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '12px 4px 0' }, children: values.map((value, index) => {
            const height = (value / max) * 100;
            return (_jsxs("div", { style: { flex: 1, minWidth: 16 }, children: [_jsx("div", { style: {
                            height: `${height}%`,
                            background: '#2563eb',
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.2s ease'
                        } }), _jsx("div", { style: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#475569' }, children: labels[index] }), _jsx("div", { style: { marginTop: 4, textAlign: 'center', fontSize: 11, color: '#0f172a' }, children: value })] }, labels[index] ?? index));
        }) }));
}
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied)
            return;
        const timer = window.setTimeout(() => setCopied(false), 1500);
        return () => window.clearTimeout(timer);
    }, [copied]);
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        }
        catch (error) {
            console.warn('Copy failed', error);
            setCopied(false);
        }
    }, [text]);
    return (_jsx("button", { type: "button", onClick: handleCopy, style: {
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #c7d2fe',
            background: copied ? '#e0e7ff' : '#fff',
            color: '#1d4ed8',
            fontWeight: 600,
            cursor: 'pointer'
        }, children: copied ? 'Copied!' : 'Copy' }));
}
function aiConfig(config) {
    if (config && typeof config.ai_entry === 'object' && config.ai_entry !== null) {
        return config.ai_entry;
    }
    return {};
}
function BacktestReviewPage({ user }) {
    const navigate = useNavigate();
    const params = useParams();
    const numericId = Number(params.backtestId);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!params.backtestId || Number.isNaN(numericId)) {
            setError('Invalid backtest id');
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchBacktestDetail(user.id, numericId)
            .then((data) => {
            if (!cancelled) {
                setDetail(data);
            }
        })
            .catch((err) => {
            if (!cancelled) {
                const message = err instanceof Error && err.message ? err.message : 'Failed to load backtest review';
                setError(message);
                console.error('Failed to fetch backtest detail', err);
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
    }, [numericId, params.backtestId, user.id]);
    useEffect(() => {
        if (detail?.backtest_name) {
            document.title = `Backtest Review · ${detail.backtest_name}`;
        }
    }, [detail?.backtest_name]);
    const safeDetail = detail;
    const summary = safeDetail?.summary_metrics ?? {};
    const config = safeDetail?.config ?? {};
    const entryConfig = aiConfig(config);
    const headlineMetrics = useMemo(() => buildHeadlineMetrics(summary), [summary]);
    const metricGroups = useMemo(() => buildMetricGroups(summary), [summary]);
    const startingBalanceSummary = parseNumber(summary['Initial_Balance']);
    const startingBalanceConfig = parseNumber(config.starting_balance);
    const startingBalanceDisplay = startingBalanceSummary
        ? formatCurrency(startingBalanceSummary)
        : startingBalanceConfig
            ? formatCurrency(startingBalanceConfig)
            : null;
    const perTradeSummary = parseNumber(summary['Per_Trade_USD'] ?? summary['per_trade_usd']);
    const perTradeConfig = parseNumber(config.usd_per_trade);
    const perTradeDisplay = perTradeSummary
        ? formatCurrency(perTradeSummary)
        : perTradeConfig
            ? formatCurrency(perTradeConfig)
            : null;
    const savedAtText = safeDetail?.saved_at_utc ?? config.saved_at_utc ?? null;
    const createdAtText = safeDetail?.created_at ?? null;
    const longEnabled = Boolean(config.long_enabled);
    const shortEnabled = Boolean(config.short_enabled);
    const longEntryText = safeDetail?.entry_text_long ?? config.long_config?.entry_explanation_long ?? null;
    const shortEntryText = safeDetail?.entry_text_short ?? config.short_config?.entry_explanation_short ?? null;
    const longCondition = typeof entryConfig.condition_code_long === 'string' ? entryConfig.condition_code_long.trim() : '';
    const shortCondition = typeof entryConfig.condition_code_short === 'string' ? entryConfig.condition_code_short.trim() : '';
    const longOffset = entryConfig.offset_long ?? '—';
    const shortOffset = entryConfig.offset_short ?? '—';
    const longExitType = config.long_config?.exit_type_position_long ?? null;
    const shortExitType = config.short_config?.exit_type_position_short ?? null;
    const longAtrPeriod = config.long_config?.atr_config_long && typeof config.long_config.atr_config_long === 'object'
        ? config.long_config.atr_config_long.period ?? null
        : null;
    const shortAtrPeriod = config.short_config?.atr_config_short && typeof config.short_config.atr_config_short === 'object'
        ? config.short_config.atr_config_short.period ?? null
        : null;
    const tradesColumns = useMemo(() => resolveTradeColumns(safeDetail?.trades_columns ?? []), [safeDetail?.trades_columns]);
    const tradeDuration = useMemo(() => {
        const raw = summary['Trade_Duration_Distribution'];
        if (!raw || typeof raw !== 'object') {
            return { labels: [], values: [] };
        }
        const entries = [];
        for (const [key, value] of Object.entries(raw)) {
            const labelNumber = Number(key);
            const count = parseNumber(value);
            if (Number.isFinite(labelNumber) && count !== null) {
                entries.push({ label: String(labelNumber), value: count });
            }
        }
        entries.sort((a, b) => Number(a.label) - Number(b.label));
        return {
            labels: entries.map((item) => item.label),
            values: entries.map((item) => item.value)
        };
    }, [summary]);
    const equityValues = useMemo(() => (safeDetail?.equity_curve ?? []).map((point) => point.balance), [safeDetail?.equity_curve]);
    const equityLabels = useMemo(() => (safeDetail?.equity_curve ?? []).map((point) => formatDateLabel(point.date)), [safeDetail?.equity_curve]);
    const drawdownValues = useMemo(() => (safeDetail?.drawdown_curve ?? []).map((value) => (typeof value === 'number' ? value * 100 : 0)), [safeDetail?.drawdown_curve]);
    const firstEquityLabel = equityLabels[0] ?? '';
    const lastEquityLabel = equityLabels[equityLabels.length - 1] ?? '';
    const participatedSymbols = safeDetail?.participated_symbols ?? [];
    const selectedSymbols = (config.selected_symbols ?? []).filter((sym) => typeof sym === 'string');
    if (loading) {
        return _jsx("div", { style: { color: '#6b7280' }, children: "Loading backtest review\u2026" });
    }
    if (error) {
        return (_jsxs("div", { style: { color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("span", { children: error }), _jsx("button", { type: "button", onClick: () => navigate('/dashboard'), style: { alignSelf: 'flex-start', border: 'none', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }, children: "Back to dashboard" })] }));
    }
    if (!safeDetail) {
        return (_jsxs("div", { style: { color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("span", { children: "Backtest details not available." }), _jsxs("span", { style: { fontSize: 12 }, children: ["If this persists, confirm the backtest files exist under `beckend/app/data/customer_data/", user.id, "/", numericId, "` and the API returns data for `/backtests/", numericId, "?user_id=", user.id, "`."] })] }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 32 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, children: [_jsx("button", { type: "button", onClick: () => navigate(-1), style: {
                            border: '1px solid #cbd5f5',
                            background: '#edf2ff',
                            color: '#1d4ed8',
                            padding: '8px 14px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "\u2190 Back" }), _jsxs("div", { style: { textAlign: 'right' }, children: [_jsx("div", { style: { fontSize: 24, fontWeight: 700, color: '#0f172a' }, children: detail.backtest_name ?? `Backtest #${detail.id}` }), _jsxs("div", { style: { fontSize: 13, color: '#64748b' }, children: ["Created ", formatDateTime(createdAtText) ?? '—'] })] })] }), _jsxs("div", { style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'center'
                }, children: [_jsx("span", { style: {
                            padding: '6px 14px',
                            borderRadius: 999,
                            background: detail.status === 'completed'
                                ? '#dcfce7'
                                : detail.status === 'failed'
                                    ? '#fee2e2'
                                    : '#e0e7ff',
                            color: detail.status === 'completed'
                                ? '#166534'
                                : detail.status === 'failed'
                                    ? '#b91c1c'
                                    : '#312e81',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                        }, children: detail.status }), savedAtText && (_jsxs("span", { style: { color: '#475569' }, children: ["Saved ", formatDateTime(savedAtText) ?? savedAtText] })), _jsx("button", { type: "button", onClick: () => navigate(`/submit_backtest?id=${detail.id}`), style: {
                            marginLeft: 'auto',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '8px 14px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 600
                        }, children: "Modify backtest" })] }), _jsx("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: _jsxs("details", { open: true, style: { border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, color: '#1d4ed8', fontSize: 16 }, children: "Strategy settings" }), _jsxs("div", { style: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }, children: [(startingBalanceDisplay || perTradeDisplay) && (_jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' }, children: [startingBalanceDisplay && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' }, children: "Starting Balance" }), _jsx("div", { style: { fontSize: 16, fontWeight: 600 }, children: startingBalanceDisplay })] })), perTradeDisplay && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' }, children: "Per Trade USD" }), _jsx("div", { style: { fontSize: 16, fontWeight: 600 }, children: perTradeDisplay })] }))] })), selectedSymbols.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }, children: ["Selected Symbols (", selectedSymbols.length, ")"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: selectedSymbols.map((symbol) => (_jsx("span", { style: {
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    background: '#f1f5f9',
                                                    color: '#0f172a',
                                                    fontSize: 13
                                                }, children: symbol }, symbol))) })] })), participatedSymbols.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }, children: ["Participated Symbols (", participatedSymbols.length, ")"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: participatedSymbols.map((symbol) => (_jsx("span", { style: {
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    background: '#ede9fe',
                                                    color: '#5b21b6',
                                                    fontSize: 13
                                                }, children: symbol }, symbol))) })] })), _jsxs("div", { style: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 16, color: '#1d4ed8' }, children: "Entry conditions" }), _jsxs("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' }, children: ["Long Entry (offset: ", String(longOffset), ")"] }), longEnabled ? (_jsxs(_Fragment, { children: [longEntryText && (_jsxs("div", { style: { fontSize: 14, lineHeight: 1.5 }, children: [_jsx("span", { style: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, marginRight: 6 }, children: "User description" }), longEntryText] })), longCondition && (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(CopyButton, { text: longCondition }), _jsx("span", { style: { fontSize: 12, color: '#94a3b8' }, children: "Copy generated code" })] })), _jsx("pre", { style: {
                                                                margin: 0,
                                                                padding: '12px 16px',
                                                                background: '#0f172a',
                                                                color: '#e2e8f0',
                                                                borderRadius: 12,
                                                                maxHeight: 180,
                                                                overflow: 'auto',
                                                                fontSize: 13
                                                            }, children: longCondition || 'Not trading long' })] })) : (_jsx("div", { style: { color: '#f87171' }, children: "Long trading disabled" }))] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' }, children: ["Short Entry (offset: ", String(shortOffset), ")"] }), shortEnabled ? (_jsxs(_Fragment, { children: [shortEntryText && (_jsxs("div", { style: { fontSize: 14, lineHeight: 1.5 }, children: [_jsx("span", { style: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, marginRight: 6 }, children: "User description" }), shortEntryText] })), shortCondition && (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(CopyButton, { text: shortCondition }), _jsx("span", { style: { fontSize: 12, color: '#94a3b8' }, children: "Copy generated code" })] })), _jsx("pre", { style: {
                                                                margin: 0,
                                                                padding: '12px 16px',
                                                                background: '#111827',
                                                                color: '#e2e8f0',
                                                                borderRadius: 12,
                                                                maxHeight: 180,
                                                                overflow: 'auto',
                                                                fontSize: 13
                                                            }, children: shortCondition || 'Not trading short' })] })) : (_jsx("div", { style: { color: '#f87171' }, children: "Short trading disabled" }))] })] }), _jsxs("div", { style: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { margin: '16px 0 12px', fontSize: 16, color: '#1d4ed8' }, children: "Long exit" }), longEnabled && longExitType ? (_jsxs("ul", { style: { margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 14, lineHeight: 1.6 }, children: [_jsxs("li", { children: ["Type: ", longExitType === 'atr' ? 'ATR' : 'Percentage'] }), longExitType === 'atr' ? (_jsxs(_Fragment, { children: [longAtrPeriod !== null && _jsxs("li", { children: ["ATR Period: ", longAtrPeriod] }), config.long_config?.tp_long !== undefined && config.long_config?.tp_long !== null && (_jsxs("li", { children: ["TP (ATR multiple): ", config.long_config?.tp_long] })), config.long_config?.sl_long !== undefined && config.long_config?.sl_long !== null && (_jsxs("li", { children: ["SL (ATR multiple): ", config.long_config?.sl_long] }))] })) : (_jsxs(_Fragment, { children: [config.long_config?.tp_long !== undefined && config.long_config?.tp_long !== null && (_jsxs("li", { children: ["TP %: ", config.long_config?.tp_long] })), config.long_config?.sl_long !== undefined && config.long_config?.sl_long !== null && (_jsxs("li", { children: ["SL %: ", config.long_config?.sl_long] }))] }))] })) : (_jsx("div", { style: { color: '#64748b' }, children: "No long exit configuration." }))] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '16px 0 12px', fontSize: 16, color: '#1d4ed8' }, children: "Short exit" }), shortEnabled && shortExitType ? (_jsxs("ul", { style: { margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 14, lineHeight: 1.6 }, children: [_jsxs("li", { children: ["Type: ", shortExitType === 'atr' ? 'ATR' : 'Percentage'] }), shortExitType === 'atr' ? (_jsxs(_Fragment, { children: [shortAtrPeriod !== null && _jsxs("li", { children: ["ATR Period: ", shortAtrPeriod] }), config.short_config?.tp_short !== undefined && config.short_config?.tp_short !== null && (_jsxs("li", { children: ["TP (ATR multiple): ", config.short_config?.tp_short] })), config.short_config?.sl_short !== undefined && config.short_config?.sl_short !== null && (_jsxs("li", { children: ["SL (ATR multiple): ", config.short_config?.sl_short] }))] })) : (_jsxs(_Fragment, { children: [config.short_config?.tp_short !== undefined && config.short_config?.tp_short !== null && (_jsxs("li", { children: ["TP %: ", config.short_config?.tp_short] })), config.short_config?.sl_short !== undefined && config.short_config?.sl_short !== null && (_jsxs("li", { children: ["SL %: ", config.short_config?.sl_short] }))] }))] })) : (_jsx("div", { style: { color: '#64748b' }, children: "No short exit configuration." }))] })] })] })] }) }), _jsx("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: _jsxs("details", { style: { border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, color: '#0f172a', fontSize: 16 }, children: "Last 10 trades" }), _jsx("div", { style: { marginTop: 16 }, children: detail.trades_preview?.length && tradesColumns.length ? (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsx("tr", { style: { textAlign: 'left', color: '#64748b', fontSize: 13 }, children: tradesColumns.map((column) => (_jsx("th", { style: { padding: '10px 12px', whiteSpace: 'nowrap' }, children: humanLabel(column) }, column))) }) }), _jsx("tbody", { children: detail.trades_preview.slice(-10).map((row, index) => (_jsx("tr", { style: { borderTop: '1px solid #e2e8f0' }, children: tradesColumns.map((column) => {
                                                    const value = row[column] ?? row[column.toLowerCase()];
                                                    const lower = column.toLowerCase();
                                                    const rawText = formatTradeCell(value);
                                                    const isPnL = lower === 'pnl';
                                                    const numeric = parseNumber(value);
                                                    const color = numeric !== null && isPnL ? (numeric < 0 ? '#dc2626' : numeric > 0 ? '#16a34a' : '#0f172a') : '#0f172a';
                                                    const positionStatus = lower === 'position_status' ? String(value ?? '') : null;
                                                    const translated = positionStatus === 'LONG_POS' ? 'Long' : positionStatus === 'SHORT_POS' ? 'Short' : rawText;
                                                    return (_jsx("td", { style: { padding: '10px 12px', color, fontSize: 13 }, children: translated }, column));
                                                }) }, index))) })] }) })) : (_jsx("div", { style: { padding: '16px 0', color: '#64748b' }, children: "No trades found." })) })] }) }), _jsx("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: _jsxs("div", { style: {
                        border: '1px solid #e2e8f0',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20
                    }, children: [_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 20 }, children: headlineMetrics.map((metric) => (_jsxs("div", { style: { minWidth: 140 }, children: [_jsx("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' }, children: metric.label }), _jsx("div", { style: {
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: metric.tone === 'pos' ? '#16a34a' : metric.tone === 'neg' ? '#dc2626' : '#0f172a'
                                        }, children: metric.value })] }, metric.label))) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }, children: "Equity curve" }), _jsx(SimpleLineChart, { values: equityValues, color: "#2563eb", fill: "#93c5fd" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 8 }, children: [_jsx("span", { children: firstEquityLabel }), _jsx("span", { children: lastEquityLabel })] })] })] }) }), _jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsx("h2", { style: { margin: 0, fontSize: 20, color: '#0f172a' }, children: "Results summary" }), metricGroups.length ? (metricGroups.map((group) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600, color: '#1d4ed8' }, children: group.group }), _jsx("div", { style: {
                                    display: 'grid',
                                    gap: 16,
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
                                }, children: group.items.map((item) => (_jsxs("div", { style: {
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 12,
                                        padding: '12px 16px',
                                        background: '#f8fafc'
                                    }, children: [_jsx("div", { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }, children: item.label }), _jsxs("div", { style: {
                                                fontSize: 18,
                                                fontWeight: 600,
                                                color: item.negative ? '#dc2626' : '#0f172a'
                                            }, children: [item.value, item.unit && _jsx("span", { style: { fontSize: 12, color: '#94a3b8', marginLeft: 4 }, children: item.unit })] })] }, `${group.group}-${item.label}`))) })] }, group.group)))) : (_jsx("div", { style: { padding: 16, borderRadius: 12, background: '#f1f5f9', color: '#64748b' }, children: "No summary metrics available." })), _jsxs("div", { style: {
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
                        }, children: [_jsxs("div", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#1e293b' }, children: "Drawdown" }), _jsx(SimpleLineChart, { values: drawdownValues, color: "#dc2626", fill: "#fca5a5" }), _jsx("div", { style: { textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 8 }, children: "Values in %" })] }), _jsxs("div", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#1e293b' }, children: "Trade duration distribution" }), _jsx(SimpleBarChart, { labels: tradeDuration.labels, values: tradeDuration.values })] })] })] }), _jsxs("section", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#0f172a' }, children: "What\u2019s next?" }), _jsx("p", { style: { margin: 0, color: '#475569', lineHeight: 1.6 }, children: "Want to iterate? Head over to the submit flow and tweak your inputs to optimize the next run. You can reuse the same configuration or start fresh with new symbols." })] })] }));
}
export default BacktestReviewPage;
