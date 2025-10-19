import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchBacktestForm, submitBacktest, updateBacktest } from '../api/client';
const STEPS = [
    { id: 1, title: 'Universe & Symbols', description: 'Choose your market focus and assets.' },
    { id: 2, title: 'Signals', description: 'Describe entries and indicators for the strategy.' },
    { id: 3, title: 'Risk & Parameters', description: 'Set balances, trade sizing, and exits.' },
    { id: 4, title: 'Review', description: 'Confirm settings before submitting.' }
];
function numericString(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    if (typeof value === 'string')
        return value;
    return '';
}
function mapConfigToState(config) {
    const longConfig = config.long_config || {};
    const shortConfig = config.short_config || {};
    return {
        backtestName: config.backtest_name || '',
        universe: config.universe || 'stocks',
        timeframe: config.timeframe || '1d',
        selectedSymbols: Array.isArray(config.selected_symbols)
            ? config.selected_symbols
            : [],
        startDate: config.backtest_start_date || '',
        endDate: config.backtest_end_date || '',
        startingBalance: numericString(config.starting_balance),
        usdPerTrade: numericString(config.usd_per_trade),
        maxCandlesLong: numericString(config.max_candles_long),
        maxCandlesShort: numericString(config.max_candles_short),
        preventOverlap: Boolean(config.prevent_overlap_per_symbol),
        longEnabled: Boolean(config.long_enabled ?? true),
        shortEnabled: Boolean(config.short_enabled ?? false),
        longExplanation: longConfig.entry_explanation_long ||
            config.entry_explanation_long ||
            config.entry_explanation ||
            '',
        shortExplanation: shortConfig.entry_explanation_short ||
            config.entry_explanation_short ||
            config.short_explanation ||
            '',
        exitTypeLong: longConfig.exit_type_position_long ||
            config.exit_type_long ||
            'percentage',
        exitTypeShort: shortConfig.exit_type_position_short ||
            config.exit_type_short ||
            'percentage',
        tpLong: numericString(longConfig.tp_long ?? config.tp_long),
        slLong: numericString(longConfig.sl_long ?? config.sl_long),
        tpShort: numericString(shortConfig.tp_short ?? config.tp_short),
        slShort: numericString(shortConfig.sl_short ?? config.sl_short),
        atrPeriodLong: numericString(longConfig.atr_config_long?.period),
        atrPeriodShort: numericString(shortConfig.atr_config_short?.period)
    };
}
function createEmptyForm() {
    return {
        backtestName: '',
        universe: 'stocks',
        timeframe: '1d',
        selectedSymbols: [],
        startDate: '',
        endDate: '',
        startingBalance: '10000',
        usdPerTrade: '100',
        maxCandlesLong: '',
        maxCandlesShort: '',
        preventOverlap: false,
        longEnabled: true,
        shortEnabled: false,
        longExplanation: '',
        shortExplanation: '',
        exitTypeLong: 'percentage',
        exitTypeShort: 'percentage',
        tpLong: '',
        slLong: '',
        tpShort: '',
        slShort: '',
        atrPeriodLong: '',
        atrPeriodShort: ''
    };
}
function mapIndicators(config) {
    const indicatorConfigs = config.indicator_configs || {};
    return Object.entries(indicatorConfigs)
        .filter(([, params]) => typeof params === 'object' && params !== null)
        .map(([key, params]) => {
        const cleanParams = {};
        Object.entries(params || {}).forEach(([k, v]) => {
            if (v === undefined || v === null)
                return;
            cleanParams[k] = typeof v === 'string' ? v : String(v);
        });
        return {
            id: key,
            alias: key,
            abbr: key.split('#')[0] || key,
            params: cleanParams
        };
    });
}
function buildSubmissionPayload(form, indicators) {
    const indicatorConfigs = indicators.reduce((acc, entry) => {
        const key = entry.alias.trim() || entry.abbr;
        if (!key)
            return acc;
        const params = {};
        Object.entries(entry.params).forEach(([paramKey, value]) => {
            const trimmed = value.trim();
            if (!trimmed)
                return;
            const numeric = Number(trimmed);
            params[paramKey] = Number.isNaN(numeric) ? trimmed : numeric;
        });
        acc[key] = params;
        return acc;
    }, {});
    const payload = {
        backtest_name: form.backtestName,
        universe: form.universe,
        timeframe: form.timeframe,
        selected_symbols: form.selectedSymbols,
        starting_balance: Number(form.startingBalance || 0),
        usd_per_trade: Number(form.usdPerTrade || 0),
        prevent_overlap_per_symbol: form.preventOverlap,
        indicator_configs: indicatorConfigs,
        long_enabled: form.longEnabled,
        short_enabled: form.shortEnabled,
        backtest_start_date: form.startDate || undefined,
        backtest_end_date: form.endDate || undefined,
        max_candles_long: form.maxCandlesLong ? Number(form.maxCandlesLong) : undefined,
        max_candles_short: form.maxCandlesShort ? Number(form.maxCandlesShort) : undefined
    };
    if (form.longEnabled) {
        payload.entry_explanation = form.longExplanation.trim() || undefined;
        payload.exit_type_long = form.exitTypeLong || undefined;
        payload.tp_long = form.tpLong ? Number(form.tpLong) : undefined;
        payload.sl_long = form.slLong ? Number(form.slLong) : undefined;
        if (form.exitTypeLong === 'atr' && form.atrPeriodLong) {
            payload.atr_config_long = { period: Number(form.atrPeriodLong) };
        }
    }
    if (form.shortEnabled) {
        payload.short_explanation = form.shortExplanation.trim() || undefined;
        payload.exit_type_short = form.exitTypeShort || undefined;
        payload.tp_short = form.tpShort ? Number(form.tpShort) : undefined;
        payload.sl_short = form.slShort ? Number(form.slShort) : undefined;
        if (form.exitTypeShort === 'atr' && form.atrPeriodShort) {
            payload.atr_config_short = { period: Number(form.atrPeriodShort) };
        }
    }
    return payload;
}
function indicatorAlias(abbr, existing) {
    const base = abbr.toUpperCase();
    let candidate = base;
    let index = 1;
    const aliases = new Set(existing.map((item) => item.alias));
    while (aliases.has(candidate)) {
        candidate = `${base}#${index}`;
        index += 1;
    }
    return candidate;
}
function filterSymbols(symbols, query) {
    const term = query.trim().toLowerCase();
    if (!term)
        return symbols;
    return symbols.filter((item) => {
        const haystack = [
            item.symbol,
            item.name,
            item.sector,
            item.industry,
            ...(item.tags || [])
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(term);
    });
}
export default function SubmitBacktestPage({ user }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const modifyIdParam = searchParams.get('id');
    const modifyId = modifyIdParam ? Number(modifyIdParam) : undefined;
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(createEmptyForm);
    const [indicatorEntries, setIndicatorEntries] = useState([]);
    const [catalogIndicators, setCatalogIndicators] = useState([]);
    const [symbolOptions, setSymbolOptions] = useState([]);
    const [tags, setTags] = useState([]);
    const [subscription, setSubscription] = useState('free');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [symbolFilter, setSymbolFilter] = useState('');
    const [symbolTagFilter, setSymbolTagFilter] = useState('');
    const filteredSymbols = useMemo(() => {
        const basic = filterSymbols(symbolOptions, symbolFilter);
        if (!symbolTagFilter) {
            return basic;
        }
        return basic.filter((symbol) => symbol.tags?.includes(symbolTagFilter));
    }, [symbolOptions, symbolFilter, symbolTagFilter]);
    const hasLong = form.longEnabled;
    const hasShort = form.shortEnabled;
    const loadForm = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchBacktestForm(user.id, {
                backtestId: Number.isFinite(modifyId) ? modifyId : undefined
            });
            setCatalogIndicators(response.indicators);
            setSymbolOptions(response.symbols);
            setTags(response.tags);
            setSubscription(response.subscription);
            if (response.mode === 'modify' && Object.keys(response.config || {}).length > 0) {
                setForm(mapConfigToState(response.config));
                setIndicatorEntries(mapIndicators(response.config));
                setStep(1);
            }
            else {
                setForm(createEmptyForm());
                setIndicatorEntries([]);
                setStep(1);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load backtest form');
        }
        finally {
            setLoading(false);
        }
    }, [user.id, modifyId]);
    useEffect(() => {
        void loadForm();
    }, [loadForm]);
    const handleNext = () => setStep((prev) => Math.min(prev + 1, STEPS.length));
    const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));
    const toggleSymbol = (symbol) => {
        setForm((prev) => {
            const exists = prev.selectedSymbols.includes(symbol);
            return {
                ...prev,
                selectedSymbols: exists
                    ? prev.selectedSymbols.filter((item) => item !== symbol)
                    : [...prev.selectedSymbols, symbol]
            };
        });
    };
    const handleIndicatorAdd = (indicator) => {
        setIndicatorEntries((prev) => {
            const alias = indicatorAlias(indicator.abbr, prev);
            const defaults = {};
            Object.entries(indicator.defaults || {}).forEach(([key, value]) => {
                if (value === undefined || value === null)
                    return;
                defaults[key] = typeof value === 'string' ? value : String(value);
            });
            return [
                ...prev,
                {
                    id: `${indicator.abbr}-${Date.now()}`,
                    alias,
                    abbr: indicator.abbr,
                    params: defaults
                }
            ];
        });
    };
    const handleIndicatorParamChange = (id, key, value) => {
        setIndicatorEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, params: { ...entry.params, [key]: value } } : entry)));
    };
    const handleIndicatorAliasChange = (id, alias) => {
        setIndicatorEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, alias } : entry)));
    };
    const handleIndicatorRemove = (id) => {
        setIndicatorEntries((prev) => prev.filter((entry) => entry.id !== id));
    };
    const handleToggleLong = (checked) => {
        setForm((prev) => {
            if (!checked && !prev.shortEnabled) {
                return prev;
            }
            return { ...prev, longEnabled: checked };
        });
    };
    const handleToggleShort = (checked) => {
        setForm((prev) => {
            if (!checked && !prev.longEnabled) {
                return prev;
            }
            return { ...prev, shortEnabled: checked };
        });
    };
    const submit = useCallback(async (payload) => {
        setSubmitting(true);
        setError(null);
        try {
            if (modifyId) {
                return await updateBacktest(user.id, modifyId, payload);
            }
            return await submitBacktest(user.id, payload);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit backtest');
            return undefined;
        }
        finally {
            setSubmitting(false);
        }
    }, [modifyId, user.id]);
    const handleSubmit = async () => {
        const payload = buildSubmissionPayload(form, indicatorEntries);
        const response = await submit(payload);
        if (response) {
            navigate('/dashboard');
        }
    };
    const isStepValid = useMemo(() => {
        if (step === 1) {
            return form.backtestName.trim() !== '' && form.selectedSymbols.length > 0;
        }
        if (step === 2) {
            if (!form.longEnabled && !form.shortEnabled)
                return false;
            if (form.longEnabled && !form.longExplanation.trim())
                return false;
            if (form.shortEnabled && !form.shortExplanation.trim())
                return false;
            return true;
        }
        if (step === 3) {
            const balance = Number(form.startingBalance || 0);
            const trade = Number(form.usdPerTrade || 0);
            return balance > 0 && trade > 0 && trade <= balance;
        }
        return true;
    }, [form, step]);
    if (loading) {
        return _jsx("div", { style: { padding: 40, textAlign: 'center' }, children: "Loading form\u2026" });
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("header", { children: [_jsx("h1", { style: { margin: 0, fontSize: 28, color: '#111827' }, children: modifyId ? 'Modify Backtest' : 'Submit Backtest' }), _jsxs("p", { style: { margin: '4px 0 0', color: '#6b7280' }, children: ["Follow the steps to configure your strategy. Subscription: ", subscription] })] }), _jsx("nav", { style: { display: 'flex', flexWrap: 'wrap', gap: 12 }, children: STEPS.map((meta) => {
                    const isActive = meta.id === step;
                    const isComplete = meta.id < step;
                    return (_jsxs("button", { type: "button", onClick: () => setStep(meta.id), style: {
                            flex: '1 1 160px',
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: '1px solid',
                            borderColor: isActive ? '#2563eb' : isComplete ? '#bfdbfe' : '#e5e7eb',
                            background: isActive ? '#eff6ff' : isComplete ? '#f8fafc' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }, children: [_jsxs("div", { style: { fontSize: 12, color: '#6b7280' }, children: ["Step ", meta.id] }), _jsx("div", { style: { fontWeight: 600, color: '#111827' }, children: meta.title }), _jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: meta.description })] }, meta.id));
                }) }), error && (_jsx("div", { style: { padding: 16, borderRadius: 12, background: '#fee2e2', color: '#991b1b' }, children: error })), step === 1 && (_jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600, color: '#111827' }, children: "Backtest Name" }), _jsx("input", { type: "text", value: form.backtestName, onChange: (event) => setForm((prev) => ({ ...prev, backtestName: event.target.value })), placeholder: "e.g. Momentum July", style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600, color: '#111827' }, children: "Universe" }), _jsxs("select", { value: form.universe, onChange: (event) => setForm((prev) => ({ ...prev, universe: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }, children: [_jsx("option", { value: "stocks", children: "Stocks" }), _jsx("option", { value: "forex", children: "Forex" }), _jsx("option", { value: "crypto", children: "Crypto" })] })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600, color: '#111827' }, children: "Timeframe" }), _jsxs("select", { value: form.timeframe, onChange: (event) => setForm((prev) => ({ ...prev, timeframe: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }, children: [_jsx("option", { value: "1m", children: "1 Minute" }), _jsx("option", { value: "5m", children: "5 Minute" }), _jsx("option", { value: "15m", children: "15 Minute" }), _jsx("option", { value: "30m", children: "30 Minute" }), _jsx("option", { value: "1h", children: "1 Hour" }), _jsx("option", { value: "1d", children: "1 Day" }), _jsx("option", { value: "1wk", children: "1 Week" }), _jsx("option", { value: "1mo", children: "1 Month" })] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' }, children: [_jsxs("label", { style: { flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600, color: '#111827' }, children: "Quick Filter" }), _jsx("input", { type: "text", value: symbolFilter, onChange: (event) => setSymbolFilter(event.target.value), placeholder: "Search symbol, name, industry", style: { padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db' } })] }), _jsxs("label", { style: { width: 180, display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600, color: '#111827' }, children: "Filter by tag" }), _jsxs("select", { value: symbolTagFilter, onChange: (event) => setSymbolTagFilter(event.target.value), style: { padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db' }, children: [_jsx("option", { value: "", children: "All tags" }), tags.map((tag) => (_jsx("option", { value: tag, children: tag }, tag)))] })] })] }), _jsxs("div", { style: {
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                        }, children: [_jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 16 }, children: "Available" }), _jsx("div", { style: { maxHeight: 320, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }, children: filteredSymbols.map((symbol) => {
                                            const checked = form.selectedSymbols.includes(symbol.symbol);
                                            return (_jsxs("label", { style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 12px',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    cursor: 'pointer',
                                                    background: checked ? '#eff6ff' : '#fff'
                                                }, children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleSymbol(symbol.symbol) }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: symbol.symbol }), _jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: symbol.name })] })] }, symbol.symbol));
                                        }) })] }), _jsxs("div", { children: [_jsxs("h3", { style: { margin: '0 0 8px', fontSize: 16 }, children: ["Selected (", form.selectedSymbols.length, ")"] }), _jsx("div", { style: {
                                            minHeight: 120,
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 12,
                                            padding: 12,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8
                                        }, children: form.selectedSymbols.map((symbol) => (_jsxs("span", { style: {
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '6px 10px',
                                                borderRadius: 999,
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                color: '#1d4ed8',
                                                fontSize: 12
                                            }, children: [symbol, _jsx("button", { type: "button", onClick: () => toggleSymbol(symbol), style: {
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#1d4ed8',
                                                        cursor: 'pointer'
                                                    }, children: "\u00D7" })] }, symbol))) })] })] })] })), step === 2 && (_jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "checkbox", checked: form.longEnabled, onChange: (event) => handleToggleLong(event.target.checked) }), _jsx("span", { style: { fontWeight: 600 }, children: "Enable Long Trades" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "checkbox", checked: form.shortEnabled, onChange: (event) => handleToggleShort(event.target.checked) }), _jsx("span", { style: { fontWeight: 600 }, children: "Enable Short Trades" })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("h3", { style: { margin: 0 }, children: "Indicators" }), _jsxs("select", { onChange: (event) => {
                                            const selected = catalogIndicators.find((item) => item.abbr === event.target.value);
                                            if (selected) {
                                                handleIndicatorAdd(selected);
                                            }
                                            event.target.selectedIndex = 0;
                                        }, style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }, defaultValue: "", children: [_jsx("option", { value: "", disabled: true, children: "Add indicator\u2026" }), catalogIndicators.map((indicator) => (_jsxs("option", { value: indicator.abbr, children: [indicator.abbr, " \u00B7 ", indicator.full] }, indicator.abbr)))] })] }), indicatorEntries.length === 0 ? (_jsx("div", { style: { padding: 16, borderRadius: 12, border: '1px dashed #d1d5db', color: '#6b7280' }, children: "No indicators added yet. Use the dropdown to add one." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: indicatorEntries.map((entry) => (_jsxs("div", { style: {
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 12,
                                        padding: 16,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12
                                    }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("strong", { children: entry.abbr }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: ["Alias", _jsx("input", { type: "text", value: entry.alias, onChange: (event) => handleIndicatorAliasChange(entry.id, event.target.value), style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db' } })] }), _jsx("button", { type: "button", onClick: () => handleIndicatorRemove(entry.id), style: {
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #fecaca',
                                                        background: '#fee2e2',
                                                        color: '#b91c1c',
                                                        cursor: 'pointer'
                                                    }, children: "Remove" })] }), _jsx("div", { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }, children: Object.entries(entry.params).map(([key, value]) => (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { style: { fontSize: 12, color: '#6b7280' }, children: key }), _jsx("input", { type: "text", value: value, onChange: (event) => handleIndicatorParamChange(entry.id, key, event.target.value), style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db' } })] }, key))) })] }, entry.id))) }))] }), form.longEnabled && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Long Entry Explanation" }), _jsx("textarea", { value: form.longExplanation, onChange: (event) => setForm((prev) => ({ ...prev, longExplanation: event.target.value })), placeholder: "Describe how the AI should identify long entries", rows: 4, style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })), form.shortEnabled && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Short Entry Explanation" }), _jsx("textarea", { value: form.shortExplanation, onChange: (event) => setForm((prev) => ({ ...prev, shortExplanation: event.target.value })), placeholder: "Describe how the AI should identify short entries", rows: 4, style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }))] })), step === 3 && (_jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Starting Balance" }), _jsx("input", { type: "number", min: 0, value: form.startingBalance, onChange: (event) => setForm((prev) => ({ ...prev, startingBalance: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "USD per Trade" }), _jsx("input", { type: "number", min: 0, value: form.usdPerTrade, onChange: (event) => setForm((prev) => ({ ...prev, usdPerTrade: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "checkbox", checked: form.preventOverlap, onChange: (event) => setForm((prev) => ({ ...prev, preventOverlap: event.target.checked })) }), "Prevent overlapping trades per symbol"] }), (hasLong || hasShort) && (_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [hasLong && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Max Candles (Long)" }), _jsx("input", { type: "number", min: 0, value: form.maxCandlesLong, onChange: (event) => setForm((prev) => ({ ...prev, maxCandlesLong: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })), hasShort && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Max Candles (Short)" }), _jsx("input", { type: "number", min: 0, value: form.maxCandlesShort, onChange: (event) => setForm((prev) => ({ ...prev, maxCandlesShort: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }))] })), (hasLong || hasShort) && (_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [hasLong && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Long Exit Type" }), _jsxs("select", { value: form.exitTypeLong, onChange: (event) => setForm((prev) => ({ ...prev, exitTypeLong: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }, children: [_jsx("option", { value: "percentage", children: "Percentage Based" }), _jsx("option", { value: "atr", children: "ATR Based" })] })] })), hasShort && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Short Exit Type" }), _jsxs("select", { value: form.exitTypeShort, onChange: (event) => setForm((prev) => ({ ...prev, exitTypeShort: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }, children: [_jsx("option", { value: "percentage", children: "Percentage Based" }), _jsx("option", { value: "atr", children: "ATR Based" })] })] }))] })), (hasLong || hasShort) && (_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [hasLong && (_jsxs(_Fragment, { children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Long Take Profit (%)" }), _jsx("input", { type: "number", value: form.tpLong, onChange: (event) => setForm((prev) => ({ ...prev, tpLong: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Long Stop Loss (%)" }), _jsx("input", { type: "number", value: form.slLong, onChange: (event) => setForm((prev) => ({ ...prev, slLong: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })] })), hasShort && (_jsxs(_Fragment, { children: [_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Short Take Profit (%)" }), _jsx("input", { type: "number", value: form.tpShort, onChange: (event) => setForm((prev) => ({ ...prev, tpShort: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }), _jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Short Stop Loss (%)" }), _jsx("input", { type: "number", value: form.slShort, onChange: (event) => setForm((prev) => ({ ...prev, slShort: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })] }))] })), (hasLong && form.exitTypeLong === 'atr') || (hasShort && form.exitTypeShort === 'atr') ? (_jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }, children: [hasLong && form.exitTypeLong === 'atr' && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "ATR Period (Long)" }), _jsx("input", { type: "number", value: form.atrPeriodLong, onChange: (event) => setForm((prev) => ({ ...prev, atrPeriodLong: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] })), hasShort && form.exitTypeShort === 'atr' && (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "ATR Period (Short)" }), _jsx("input", { type: "number", value: form.atrPeriodShort, onChange: (event) => setForm((prev) => ({ ...prev, atrPeriodShort: event.target.value })), style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' } })] }))] })) : null] })), step === 4 && (_jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: {
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding: 16,
                            display: 'grid',
                            gap: 12,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Name" }), _jsx("div", { style: { fontWeight: 600 }, children: form.backtestName || '—' })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Universe" }), _jsx("div", { style: { fontWeight: 600 }, children: form.universe })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Timeframe" }), _jsx("div", { style: { fontWeight: 600 }, children: form.timeframe })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Symbols" }), _jsx("div", { style: { fontWeight: 600 }, children: form.selectedSymbols.join(', ') || '—' })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "Starting Balance" }), _jsxs("div", { style: { fontWeight: 600 }, children: ["$", form.startingBalance || '0'] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "USD per Trade" }), _jsxs("div", { style: { fontWeight: 600 }, children: ["$", form.usdPerTrade || '0'] })] })] }), _jsxs("div", { style: {
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }, children: [_jsx("h3", { style: { margin: 0 }, children: "Indicators" }), indicatorEntries.length === 0 ? (_jsx("p", { style: { margin: 0, color: '#6b7280' }, children: "No indicators selected." })) : (indicatorEntries.map((entry) => (_jsxs("div", { style: { fontSize: 14 }, children: [_jsx("strong", { children: entry.alias }), ": ", Object.entries(entry.params).map(([k, v]) => `${k}=${v}`).join(', ')] }, entry.id))))] }), (hasLong && form.longExplanation.trim()) || (hasShort && form.shortExplanation.trim()) ? (_jsxs("div", { style: {
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }, children: [_jsx("h3", { style: { margin: 0 }, children: "Narrative" }), hasLong && form.longExplanation.trim() && (_jsxs("div", { children: [_jsx("strong", { children: "Long Entry Guidance" }), _jsx("p", { style: { margin: '4px 0 0' }, children: form.longExplanation.trim() })] })), hasShort && form.shortExplanation.trim() && (_jsxs("div", { children: [_jsx("strong", { children: "Short Entry Guidance" }), _jsx("p", { style: { margin: '4px 0 0' }, children: form.shortExplanation.trim() })] }))] })) : null] })), _jsxs("footer", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("button", { type: "button", onClick: handlePrev, disabled: step === 1 || submitting, style: {
                            padding: '10px 16px',
                            borderRadius: 10,
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            color: '#111827',
                            cursor: step === 1 || submitting ? 'not-allowed' : 'pointer'
                        }, children: "Previous" }), step < STEPS.length ? (_jsx("button", { type: "button", onClick: handleNext, disabled: !isStepValid || submitting, style: {
                            padding: '10px 16px',
                            borderRadius: 10,
                            border: 'none',
                            background: isStepValid ? '#2563eb' : '#a5b4fc',
                            color: '#fff',
                            cursor: !isStepValid || submitting ? 'not-allowed' : 'pointer'
                        }, children: "Next" })) : (_jsx("button", { type: "button", onClick: handleSubmit, disabled: submitting, style: {
                            padding: '12px 24px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer'
                        }, children: submitting ? 'Submitting…' : modifyId ? 'Update Backtest' : 'Submit Backtest' }))] })] }));
}
