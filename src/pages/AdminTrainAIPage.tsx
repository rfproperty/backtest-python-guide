import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type {
  AdminTrainAIResponse,
  IndicatorCatalogItem,
  User
} from '../types';
import { ADMIN_EMAIL } from '../config';
import {
  fetchAdminTrainAIBootstrap,
  generateAdminTrainAI,
  submitAdminTrainAIFeedback
} from '../api/client';

interface AdminTrainAIPageProps {
  user: User;
}

interface IndicatorInstance {
  id: string;
  abbr: string;
  params: Record<string, string>;
}

type SideKey = 'long' | 'short';

interface FeedbackState {
  rating: 1 | -1 | 0;
  comment: string;
  submitting: boolean;
  status: string | null;
  error: string | null;
}

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 120,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #cbd5f5',
  fontSize: 14,
  lineHeight: 1.5,
  resize: 'vertical'
};

const buttonStyle: CSSProperties = {
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  padding: '10px 18px',
  borderRadius: 999,
  cursor: 'pointer',
  fontWeight: 600
};

function createInitialFeedbackState(): Record<SideKey, FeedbackState> {
  return {
    long: { rating: 0, comment: '', submitting: false, status: null, error: null },
    short: { rating: 0, comment: '', submitting: false, status: null, error: null }
  };
}

export default function AdminTrainAIPage({ user }: AdminTrainAIPageProps) {
  const [catalog, setCatalog] = useState<IndicatorCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indicatorKey, setIndicatorKey] = useState<string>('');
  const [indicatorInstances, setIndicatorInstances] = useState<IndicatorInstance[]>([]);
  const [longEnabled, setLongEnabled] = useState(false);
  const [shortEnabled, setShortEnabled] = useState(false);
  const [entryLong, setEntryLong] = useState('');
  const [entryShort, setEntryShort] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AdminTrainAIResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<SideKey, FeedbackState>>(createInitialFeedbackState);

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
        if (!isMounted) return;
        setCatalog(data.indicators);
        setIndicatorKey(data.indicators[0]?.abbr ?? '');
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load indicator catalog';
        setError(message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isAdmin, user.id]);

  useEffect(() => {
    setFeedbackState(createInitialFeedbackState());
  }, [result]);

  const indicatorLookup = useMemo(() => {
    const map = new Map<string, IndicatorCatalogItem>();
    catalog.forEach((item) => map.set(item.abbr, item));
    return map;
  }, [catalog]);

  const updateFeedbackState = useCallback((side: SideKey, patch: Partial<FeedbackState>) => {
    setFeedbackState((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch }
    }));
  }, []);

  const handleAddIndicator = useCallback(() => {
    if (!indicatorKey) return;
    const meta = indicatorLookup.get(indicatorKey);
    if (!meta) return;

    const defaults = Object.entries(meta.defaults ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
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

  const handleRemoveIndicator = useCallback((id: string) => {
    setIndicatorInstances((prev) => prev.filter((instance) => instance.id !== id));
  }, []);

  const handleParamChange = useCallback((id: string, key: string, value: string) => {
    setIndicatorInstances((prev) =>
      prev.map((instance) =>
        instance.id === id
          ? { ...instance, params: { ...instance.params, [key]: value } }
          : instance
      )
    );
  }, []);

  const handleRatingSelect = useCallback(
    (side: SideKey, nextRating: 1 | -1) => {
      setStatusMessage(null);
      setError(null);
      updateFeedbackState(side, {
        rating: feedbackState[side].rating === nextRating ? 0 : nextRating,
        status: null,
        error: null
      });
    },
    [feedbackState, updateFeedbackState]
  );

  const handleCommentChange = useCallback(
    (side: SideKey, value: string) => {
      updateFeedbackState(side, {
        comment: value,
        status: null,
        error: null
      });
    },
    [updateFeedbackState]
  );

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

    const indicatorPayload = indicatorInstances.reduce<Record<string, Record<string, unknown>>>(
      (acc, instance) => {
        const params: Record<string, unknown> = {};
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
      },
      {}
    );

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
    } finally {
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

  const handleCopy = useCallback(async (text?: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage('Copied to clipboard.');
    } catch (err) {
      console.error('Failed to copy text', err);
      setStatusMessage('Failed to copy to clipboard.');
    }
  }, []);

  const handleFeedbackSubmit = useCallback(
    async (side: SideKey) => {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit feedback';
        updateFeedbackState(side, {
          submitting: false,
          error: message
        });
      }
    },
    [feedbackState, result, updateFeedbackState, user.id]
  );

  if (!isAdmin) {
    return <p style={{ color: '#ef4444' }}>Admin access required.</p>;
  }

  if (loading) {
    return <p>Loading admin tools…</p>;
  }

  return (
    <div className="admin-train-ai" style={{ display: 'grid', gap: 24 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>Admin LLaMA Playground</h1>
        <p style={{ color: '#475569', fontSize: 14 }}>
          Generate entry code snippets against a reference AAPL dataset to vet LLaMA responses.
        </p>
      </header>

      {error && (
        <div style={{ border: '1px solid #fecaca', background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 12 }}>
          {error}
        </div>
      )}

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, background: '#f8fafc', display: 'grid', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>Signal Setup</h2>
          <p style={{ fontSize: 14, color: '#475569' }}>Toggle trade sides, choose indicators, and describe entries.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 16,
              border: longEnabled ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: longEnabled ? '#dbeafe' : '#f8fafc',
              cursor: 'pointer'
            }}
          >
            <input type="checkbox" checked={longEnabled} onChange={(event) => setLongEnabled(event.target.checked)} />
            Long (Buy)
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 16,
              border: shortEnabled ? '1px solid #be123c' : '1px solid #e2e8f0',
              background: shortEnabled ? '#ffe4e6' : '#f8fafc',
              cursor: 'pointer'
            }}
          >
            <input type="checkbox" checked={shortEnabled} onChange={(event) => setShortEnabled(event.target.checked)} />
            Short (Sell)
          </label>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Long Entry</h3>
            <textarea
              value={entryLong}
              onChange={(event) => setEntryLong(event.target.value)}
              placeholder="Describe the long signal in plain English"
              style={textareaStyle}
            />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Short Entry</h3>
            <textarea
              value={entryShort}
              onChange={(event) => setEntryShort(event.target.value)}
              placeholder="Describe the short signal in plain English"
              style={{ ...textareaStyle, borderColor: '#fecaca' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 600 }}>Indicators</label>
            <select
              value={indicatorKey}
              onChange={(event) => setIndicatorKey(event.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5f5' }}
            >
              {catalog.map((indicator) => (
                <option key={indicator.abbr} value={indicator.abbr}>
                  {indicator.abbr} - {indicator.full}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleAddIndicator} style={{ ...buttonStyle, background: '#0f172a' }}>
              Add
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#64748b' }}>
            {indicatorInstances.length === 0
              ? 'No indicators added yet.'
              : `${indicatorInstances.length} indicator${indicatorInstances.length === 1 ? '' : 's'} configured.`}
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {indicatorInstances.map((instance) => (
              <fieldset
                key={instance.id}
                style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff' }}
              >
                <legend style={{ fontWeight: 600 }}>{instance.id}</legend>
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.entries(instance.params).map(([key, value]) => (
                    <label key={key} style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{key}</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(event) => handleParamChange(instance.id, key, event.target.value)}
                        style={{
                          border: '1px solid #cbd5f5',
                          borderRadius: 10,
                          padding: '8px 10px',
                          fontSize: 13
                        }}
                      />
                    </label>
                  ))}
                  {Object.keys(instance.params).length === 0 && (
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>No parameters required.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveIndicator(instance.id)}
                    style={{
                      ...buttonStyle,
                      background: '#ef4444',
                      padding: '8px 14px',
                      justifySelf: 'start'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {statusMessage && <span style={{ fontSize: 13, color: '#64748b' }}>{statusMessage}</span>}
          <button type="button" onClick={handleGenerate} style={buttonStyle} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Code'}
          </button>
        </div>
      </section>

      {result && (
        <section style={{ display: 'grid', gap: 16 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>Generated Code</h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Data source: {result.meta.data_path} | Columns: {(result.meta.columns || []).join(', ')}
            </span>
          </header>

          {result.meta.indicator_configs && Object.keys(result.meta.indicator_configs).length > 0 && (
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: 16,
                background: '#fff',
                display: 'grid',
                gap: 8
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Indicator Parameters</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(result.meta.indicator_configs).map(([key, params]) => (
                  <div key={key} style={{ fontSize: 13, color: '#0f172a' }}>
                    <strong>{key}</strong>:{' '}
                    {Object.entries(params)
                      .map(([paramKey, paramVal]) => `${paramKey}=${paramVal}`)
                      .join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {[
            { label: 'Long Entry', data: result.long, side: 'long' as const },
            { label: 'Short Entry', data: result.short, side: 'short' as const }
          ].map(({ label, data, side }) => {
            if (!data.enabled) return null;
            const form = feedbackState[side];
            return (
              <div
                key={side}
                style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, background: '#fff', display: 'grid', gap: 12 }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{label}</h3>
                  {typeof data.offset === 'number' && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>offset: {data.offset}</span>
                  )}
                  {data.code && (
                    <button
                      type="button"
                      onClick={() => handleCopy(data.code ?? '')}
                      style={{ ...buttonStyle, background: '#0f172a', padding: '6px 12px' }}
                    >
                      Copy code
                    </button>
                  )}
                </div>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: 16,
                    borderRadius: 16,
                    overflowX: 'auto',
                    fontSize: 13,
                    lineHeight: 1.6
                  }}
                >
                  {data.code ?? 'No code generated.'}
                </pre>
                {data.prompt && (
                  <details>
                    <summary style={{ fontSize: 13, color: '#2563eb', cursor: 'pointer' }}>Show prompt</summary>
                    <pre
                      style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        padding: 16,
                        borderRadius: 12,
                        overflowX: 'auto',
                        fontSize: 12
                      }}
                    >
                      {data.prompt}
                    </pre>
                  </details>
                )}

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Was this useful?</span>
                    <button
                      type="button"
                      onClick={() => handleRatingSelect(side, 1)}
                      style={{
                        ...buttonStyle,
                        padding: '6px 12px',
                        background: form.rating === 1 ? '#dbeafe' : '#f8fafc',
                        color: form.rating === 1 ? '#1d4ed8' : '#0f172a',
                        border: form.rating === 1 ? '1px solid #1d4ed8' : '1px solid #cbd5f5'
                      }}
                    >
                      👍 Thumbs up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRatingSelect(side, -1)}
                      style={{
                        ...buttonStyle,
                        padding: '6px 12px',
                        background: form.rating === -1 ? '#fee2e2' : '#f8fafc',
                        color: form.rating === -1 ? '#b91c1c' : '#0f172a',
                        border: form.rating === -1 ? '1px solid #b91c1c' : '1px solid #cbd5f5'
                      }}
                    >
                      👎 Thumbs down
                    </button>
                  </div>

                  <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    Additional remarks (optional)
                    <textarea
                      value={form.comment}
                      onChange={(event) => handleCommentChange(side, event.target.value)}
                      placeholder="Share any context that helps evaluate this snippet"
                      style={{
                        ...textareaStyle,
                        minHeight: 80,
                        borderRadius: 12,
                        borderColor: '#cbd5f5'
                      }}
                    />
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {form.error && <span style={{ fontSize: 12, color: '#dc2626' }}>{form.error}</span>}
                      {form.status && <span style={{ fontSize: 12, color: '#16a34a' }}>{form.status}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFeedbackSubmit(side)}
                      style={{
                        ...buttonStyle,
                        background: '#1e3a8a',
                        padding: '8px 16px',
                        opacity: form.submitting ? 0.7 : 1,
                        pointerEvents: form.submitting ? 'none' : 'auto'
                      }}
                    >
                      {form.submitting ? 'Submitting…' : 'Submit feedback'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {result.meta.indicator_keys.length > 0 && (
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Indicators used: {result.meta.indicator_keys.join(', ')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
