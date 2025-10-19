import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_EMAIL } from '../config';
import { fetchAdminTrainAIBootstrap, generateAdminTrainAI, submitAdminTrainAIFeedback } from '../api/client';
const textareaStyle = {
    width: '100%',
    minHeight: 120,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5f5',
    fontSize: 14,
    lineHeight: 1.5,
    resize: 'vertical'
};
const buttonStyle = {
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 600
};
function createInitialFeedbackState() {
    return {
        long: { rating: 0, comment: '', submitting: false, status: null, error: null },
        short: { rating: 0, comment: '', submitting: false, status: null, error: null }
    };
}
export default function AdminTrainAIPage({ user }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [indicatorKey, setIndicatorKey] = useState('');
    const [indicatorInstances, setIndicatorInstances] = useState([]);
    const [longEnabled, setLongEnabled] = useState(false);
    const [shortEnabled, setShortEnabled] = useState(false);
    const [entryLong, setEntryLong] = useState('');
    const [entryShort, setEntryShort] = useState('');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [feedbackState, setFeedbackState] = useState(createInitialFeedbackState);
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL;
    useEffect(() => {
        if (!isAdmin) {
            setError('Admin access required.');
            setLoading(false);
            return;
        }
        let isMounted = true;
        setLoading(true);
        fetchAdminTrainAIBootstrap(user.id)
            .then((data) => {
            if (!isMounted)
                return;
            setCatalog(data.indicators);
            setIndicatorKey(data.indicators[0]?.abbr ?? '');
        })
            .catch((err) => {
            if (!isMounted)
                return;
            const message = err instanceof Error ? err.message : 'Failed to load indicator catalog';
            setError(message);
        })
            .finally(() => {
            if (isMounted)
                setLoading(false);
        });
        return () => {
            isMounted = false;
        };
    }, [isAdmin, user.id]);
    useEffect(() => {
        setFeedbackState(createInitialFeedbackState());
    }, [result]);
    const indicatorLookup = useMemo(() => {
        const map = new Map();
        catalog.forEach((item) => map.set(item.abbr, item));
        return map;
    }, [catalog]);
    const updateFeedbackState = useCallback((side, patch) => {
        setFeedbackState((prev) => ({
            ...prev,
            [side]: { ...prev[side], ...patch }
        }));
    }, []);
    const handleAddIndicator = useCallback(() => {
        if (!indicatorKey)
            return;
        const meta = indicatorLookup.get(indicatorKey);
        if (!meta)
            return;
        const defaults = Object.entries(meta.defaults ?? {}).reduce((acc, [key, value]) => {
            acc[key] = String(value ?? '');
            return acc;
        }, {});
        let candidate = meta.abbr;
        const existing = new Set(indicatorInstances.map((instance) => instance.id));
        let counter = 1;
        while (existing.has(candidate)) {
            counter += 1;
            candidate = `${meta.abbr}#${counter}`;
        }
        setIndicatorInstances((prev) => [...prev, { id: candidate, abbr: meta.abbr, params: defaults }]);
        setStatusMessage(null);
    }, [indicatorKey, indicatorInstances, indicatorLookup]);
    const handleRemoveIndicator = useCallback((id) => {
        setIndicatorInstances((prev) => prev.filter((instance) => instance.id !== id));
    }, []);
    const handleParamChange = useCallback((id, key, value) => {
        setIndicatorInstances((prev) => prev.map((instance) => instance.id === id
            ? { ...instance, params: { ...instance.params, [key]: value } }
            : instance));
    }, []);
    const handleRatingSelect = useCallback((side, nextRating) => {
        setStatusMessage(null);
        setError(null);
        updateFeedbackState(side, {
            rating: feedbackState[side].rating === nextRating ? 0 : nextRating,
            status: null,
            error: null
        });
    }, [feedbackState, updateFeedbackState]);
    const handleCommentChange = useCallback((side, value) => {
        updateFeedbackState(side, {
            comment: value,
            status: null,
            error: null
        });
    }, [updateFeedbackState]);
    const handleGenerate = useCallback(async () => {
        if (!isAdmin) {
            setError('Admin access required.');
            return;
        }
        setError(null);
        setStatusMessage(null);
        if (!longEnabled && !shortEnabled) {
            setError('Enable at least one trade direction (long or short).');
            return;
        }
        if (longEnabled && !entryLong.trim()) {
            setError('Provide a plain-English description for the long entry.');
            return;
        }
        if (shortEnabled && !entryShort.trim()) {
            setError('Provide a plain-English description for the short entry.');
            return;
        }
        const indicatorPayload = indicatorInstances.reduce((acc, instance) => {
            const params = {};
            Object.entries(instance.params).forEach(([key, rawValue]) => {
                const trimmed = rawValue.trim();
                if (!trimmed) {
                    return;
                }
                const numeric = Number(trimmed);
                params[key] = Number.isNaN(numeric) ? trimmed : numeric;
            });
            acc[instance.id] = params;
            return acc;
        }, {});
        setGenerating(true);
        try {
            const response = await generateAdminTrainAI(user.id, {
                long_enabled: longEnabled,
                short_enabled: shortEnabled,
                entry_explanation: entryLong,
                short_explanation: entryShort,
                indicator_configs: indicatorPayload
            });
            setResult(response);
            setStatusMessage('Generation completed successfully.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Generation failed';
            setError(message);
        }
        finally {
            setGenerating(false);
        }
    }, [
        entryLong,
        entryShort,
        indicatorInstances,
        isAdmin,
        longEnabled,
        shortEnabled,
        user.id
    ]);
    const handleCopy = useCallback(async (text) => {
        if (!text)
            return;
        try {
            await navigator.clipboard.writeText(text);
            setStatusMessage('Copied to clipboard.');
        }
        catch (err) {
            console.error('Failed to copy text', err);
            setStatusMessage('Failed to copy to clipboard.');
        }
    }, []);
    const handleFeedbackSubmit = useCallback(async (side) => {
        if (!result) {
            updateFeedbackState(side, {
                error: 'Generate code before leaving feedback.',
                status: null
            });
            return;
        }
        const sideData = side === 'long' ? result.long : result.short;
        if (!sideData.enabled || !sideData.code) {
            updateFeedbackState(side, {
                error: 'No code available for this side.',
                status: null
            });
            return;
        }
        const form = feedbackState[side];
        if (form.rating === 0) {
            updateFeedbackState(side, {
                error: 'Select thumbs up or thumbs down before submitting.',
                status: null
            });
            return;
        }
        updateFeedbackState(side, { submitting: true, error: null, status: null });
        try {
            await submitAdminTrainAIFeedback(user.id, {
                side,
                code: sideData.code ?? '',
                rating: form.rating,
                comment: form.comment || undefined,
                prompt: sideData.prompt ?? undefined,
                model: 'llama3.1',
                tags: ['admin_train_ai'],
                meta: {
                    indicator_keys: result.meta.indicator_keys ?? [],
                    columns: result.meta.columns ?? [],
                    user_input: sideData.user_input ?? '',
                    prompt: sideData.prompt ?? undefined,
                    indicator_configs: result.meta.indicator_configs ?? {},
                    indicator_prompt_details: result.meta.indicator_prompt_details ?? {}
                }
            });
            updateFeedbackState(side, {
                submitting: false,
                status: 'Feedback saved. Thank you!'
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit feedback';
            updateFeedbackState(side, {
                submitting: false,
                error: message
            });
        }
    }, [feedbackState, result, updateFeedbackState, user.id]);
    if (!isAdmin) {
        return _jsx("p", { style: { color: '#ef4444' }, children: "Admin access required." });
    }
    if (loading) {
        return _jsx("p", { children: "Loading admin tools\u2026" });
    }
    return (_jsxs("div", { className: "admin-train-ai", style: { display: 'grid', gap: 24 }, children: [_jsxs("header", { style: { display: 'grid', gap: 8 }, children: [_jsx("h1", { style: { fontSize: 28, fontWeight: 700, color: '#0f172a' }, children: "Admin LLaMA Playground" }), _jsx("p", { style: { color: '#475569', fontSize: 14 }, children: "Generate entry code snippets against a reference AAPL dataset to vet LLaMA responses." })] }), error && (_jsx("div", { style: { border: '1px solid #fecaca', background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 12 }, children: error })), _jsxs("section", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, background: '#f8fafc', display: 'grid', gap: 24 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: 20, fontWeight: 600, color: '#0f172a' }, children: "Signal Setup" }), _jsx("p", { style: { fontSize: 14, color: '#475569' }, children: "Toggle trade sides, choose indicators, and describe entries." })] }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [_jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 14px',
                                    borderRadius: 16,
                                    border: longEnabled ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    background: longEnabled ? '#dbeafe' : '#f8fafc',
                                    cursor: 'pointer'
                                }, children: [_jsx("input", { type: "checkbox", checked: longEnabled, onChange: (event) => setLongEnabled(event.target.checked) }), "Long (Buy)"] }), _jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 14px',
                                    borderRadius: 16,
                                    border: shortEnabled ? '1px solid #be123c' : '1px solid #e2e8f0',
                                    background: shortEnabled ? '#ffe4e6' : '#f8fafc',
                                    cursor: 'pointer'
                                }, children: [_jsx("input", { type: "checkbox", checked: shortEnabled, onChange: (event) => setShortEnabled(event.target.checked) }), "Short (Sell)"] })] }), _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 600, color: '#0f172a' }, children: "Long Entry" }), _jsx("textarea", { value: entryLong, onChange: (event) => setEntryLong(event.target.value), placeholder: "Describe the long signal in plain English", style: textareaStyle })] }), _jsxs("div", { children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 600, color: '#0f172a' }, children: "Short Entry" }), _jsx("textarea", { value: entryShort, onChange: (event) => setEntryShort(event.target.value), placeholder: "Describe the short signal in plain English", style: { ...textareaStyle, borderColor: '#fecaca' } })] })] }), _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("label", { style: { fontWeight: 600 }, children: "Indicators" }), _jsx("select", { value: indicatorKey, onChange: (event) => setIndicatorKey(event.target.value), style: { flex: 1, minWidth: 160, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5f5' }, children: catalog.map((indicator) => (_jsxs("option", { value: indicator.abbr, children: [indicator.abbr, " - ", indicator.full] }, indicator.abbr))) }), _jsx("button", { type: "button", onClick: handleAddIndicator, style: { ...buttonStyle, background: '#0f172a' }, children: "Add" })] }), _jsx("p", { style: { fontSize: 13, color: '#64748b' }, children: indicatorInstances.length === 0
                                    ? 'No indicators added yet.'
                                    : `${indicatorInstances.length} indicator${indicatorInstances.length === 1 ? '' : 's'} configured.` }), _jsx("div", { style: { display: 'grid', gap: 12 }, children: indicatorInstances.map((instance) => (_jsxs("fieldset", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff' }, children: [_jsx("legend", { style: { fontWeight: 600 }, children: instance.id }), _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [Object.entries(instance.params).map(([key, value]) => (_jsxs("label", { style: { display: 'grid', gap: 6, fontSize: 13 }, children: [_jsx("span", { style: { fontWeight: 500 }, children: key }), _jsx("input", { type: "text", value: value, onChange: (event) => handleParamChange(instance.id, key, event.target.value), style: {
                                                                border: '1px solid #cbd5f5',
                                                                borderRadius: 10,
                                                                padding: '8px 10px',
                                                                fontSize: 13
                                                            } })] }, key))), Object.keys(instance.params).length === 0 && (_jsx("p", { style: { fontSize: 13, color: '#94a3b8' }, children: "No parameters required." })), _jsx("button", { type: "button", onClick: () => handleRemoveIndicator(instance.id), style: {
                                                        ...buttonStyle,
                                                        background: '#ef4444',
                                                        padding: '8px 14px',
                                                        justifySelf: 'start'
                                                    }, children: "Remove" })] })] }, instance.id))) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }, children: [statusMessage && _jsx("span", { style: { fontSize: 13, color: '#64748b' }, children: statusMessage }), _jsx("button", { type: "button", onClick: handleGenerate, style: buttonStyle, disabled: generating, children: generating ? 'Generating…' : 'Generate Code' })] })] }), result && (_jsxs("section", { style: { display: 'grid', gap: 16 }, children: [_jsxs("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("h2", { style: { fontSize: 20, fontWeight: 600, color: '#0f172a' }, children: "Generated Code" }), _jsxs("span", { style: { fontSize: 12, color: '#64748b' }, children: ["Data source: ", result.meta.data_path, " | Columns: ", (result.meta.columns || []).join(', ')] })] }), result.meta.indicator_configs && Object.keys(result.meta.indicator_configs).length > 0 && (_jsxs("div", { style: {
                            border: '1px solid #e2e8f0',
                            borderRadius: 16,
                            padding: 16,
                            background: '#fff',
                            display: 'grid',
                            gap: 8
                        }, children: [_jsx("h3", { style: { margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }, children: "Indicator Parameters" }), _jsx("div", { style: { display: 'grid', gap: 6 }, children: Object.entries(result.meta.indicator_configs).map(([key, params]) => (_jsxs("div", { style: { fontSize: 13, color: '#0f172a' }, children: [_jsx("strong", { children: key }), ":", ' ', Object.entries(params)
                                            .map(([paramKey, paramVal]) => `${paramKey}=${paramVal}`)
                                            .join(', ')] }, key))) })] })), [
                        { label: 'Long Entry', data: result.long, side: 'long' },
                        { label: 'Short Entry', data: result.short, side: 'short' }
                    ].map(({ label, data, side }) => {
                        if (!data.enabled)
                            return null;
                        const form = feedbackState[side];
                        return (_jsxs("div", { style: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, background: '#fff', display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 600, color: '#0f172a' }, children: label }), typeof data.offset === 'number' && (_jsxs("span", { style: { fontSize: 12, color: '#64748b' }, children: ["offset: ", data.offset] })), data.code && (_jsx("button", { type: "button", onClick: () => handleCopy(data.code ?? ''), style: { ...buttonStyle, background: '#0f172a', padding: '6px 12px' }, children: "Copy code" }))] }), _jsx("pre", { style: {
                                        background: '#0f172a',
                                        color: '#f8fafc',
                                        padding: 16,
                                        borderRadius: 16,
                                        overflowX: 'auto',
                                        fontSize: 13,
                                        lineHeight: 1.6
                                    }, children: data.code ?? 'No code generated.' }), data.prompt && (_jsxs("details", { children: [_jsx("summary", { style: { fontSize: 13, color: '#2563eb', cursor: 'pointer' }, children: "Show prompt" }), _jsx("pre", { style: {
                                                background: '#f1f5f9',
                                                color: '#0f172a',
                                                padding: 16,
                                                borderRadius: 12,
                                                overflowX: 'auto',
                                                fontSize: 12
                                            }, children: data.prompt })] })), _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 600, color: '#0f172a' }, children: "Was this useful?" }), _jsx("button", { type: "button", onClick: () => handleRatingSelect(side, 1), style: {
                                                        ...buttonStyle,
                                                        padding: '6px 12px',
                                                        background: form.rating === 1 ? '#dbeafe' : '#f8fafc',
                                                        color: form.rating === 1 ? '#1d4ed8' : '#0f172a',
                                                        border: form.rating === 1 ? '1px solid #1d4ed8' : '1px solid #cbd5f5'
                                                    }, children: "\uD83D\uDC4D Thumbs up" }), _jsx("button", { type: "button", onClick: () => handleRatingSelect(side, -1), style: {
                                                        ...buttonStyle,
                                                        padding: '6px 12px',
                                                        background: form.rating === -1 ? '#fee2e2' : '#f8fafc',
                                                        color: form.rating === -1 ? '#b91c1c' : '#0f172a',
                                                        border: form.rating === -1 ? '1px solid #b91c1c' : '1px solid #cbd5f5'
                                                    }, children: "\uD83D\uDC4E Thumbs down" })] }), _jsxs("label", { style: { display: 'grid', gap: 6, fontSize: 13 }, children: ["Additional remarks (optional)", _jsx("textarea", { value: form.comment, onChange: (event) => handleCommentChange(side, event.target.value), placeholder: "Share any context that helps evaluate this snippet", style: {
                                                        ...textareaStyle,
                                                        minHeight: 80,
                                                        borderRadius: 12,
                                                        borderColor: '#cbd5f5'
                                                    } })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [form.error && _jsx("span", { style: { fontSize: 12, color: '#dc2626' }, children: form.error }), form.status && _jsx("span", { style: { fontSize: 12, color: '#16a34a' }, children: form.status })] }), _jsx("button", { type: "button", onClick: () => handleFeedbackSubmit(side), style: {
                                                        ...buttonStyle,
                                                        background: '#1e3a8a',
                                                        padding: '8px 16px',
                                                        opacity: form.submitting ? 0.7 : 1,
                                                        pointerEvents: form.submitting ? 'none' : 'auto'
                                                    }, children: form.submitting ? 'Submitting…' : 'Submit feedback' })] })] })] }, side));
                    }), result.meta.indicator_keys.length > 0 && (_jsxs("p", { style: { fontSize: 13, color: '#64748b' }, children: ["Indicators used: ", result.meta.indicator_keys.join(', ')] }))] }))] }));
}
