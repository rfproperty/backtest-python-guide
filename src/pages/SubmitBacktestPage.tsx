import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchBacktestForm,
  submitBacktest,
  updateBacktest
} from '../api/client';
import type {
  BacktestFormResponse,
  BacktestSubmissionPayload,
  IndicatorOption,
  SymbolOption,
  SubmitBacktestResponse,
  User
} from '../types';

interface SubmitBacktestPageProps {
  user: User;
}

interface FormState {
  backtestName: string;
  universe: string;
  timeframe: string;
  selectedSymbols: string[];
  startDate: string;
  endDate: string;
  startingBalance: string;
  usdPerTrade: string;
  maxCandlesLong: string;
  maxCandlesShort: string;
  preventOverlap: boolean;
  longEnabled: boolean;
  shortEnabled: boolean;
  longExplanation: string;
  shortExplanation: string;
  exitTypeLong: string;
  exitTypeShort: string;
  tpLong: string;
  slLong: string;
  tpShort: string;
  slShort: string;
  atrPeriodLong: string;
  atrPeriodShort: string;
}

interface IndicatorEntry {
  id: string;
  alias: string;
  abbr: string;
  params: Record<string, string>;
}

interface StepMeta {
  id: number;
  title: string;
  description: string;
}

const STEPS: StepMeta[] = [
  { id: 1, title: 'Universe & Symbols', description: 'Choose your market focus and assets.' },
  { id: 2, title: 'Signals', description: 'Describe entries and indicators for the strategy.' },
  { id: 3, title: 'Risk & Parameters', description: 'Set balances, trade sizing, and exits.' },
  { id: 4, title: 'Review', description: 'Confirm settings before submitting.' }
];

function numericString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  return '';
}

function mapConfigToState(config: Record<string, unknown>): FormState {
  const longConfig = (config.long_config as Record<string, unknown>) || {};
  const shortConfig = (config.short_config as Record<string, unknown>) || {};
  return {
    backtestName: (config.backtest_name as string) || '',
    universe: (config.universe as string) || 'stocks',
    timeframe: (config.timeframe as string) || '1d',
    selectedSymbols: Array.isArray(config.selected_symbols)
      ? (config.selected_symbols as string[])
      : [],
    startDate: (config.backtest_start_date as string) || '',
    endDate: (config.backtest_end_date as string) || '',
    startingBalance: numericString(config.starting_balance),
    usdPerTrade: numericString(config.usd_per_trade),
    maxCandlesLong: numericString(config.max_candles_long),
    maxCandlesShort: numericString(config.max_candles_short),
    preventOverlap: Boolean(config.prevent_overlap_per_symbol),
    longEnabled: Boolean(config.long_enabled ?? true),
    shortEnabled: Boolean(config.short_enabled ?? false),
    longExplanation:
      (longConfig.entry_explanation_long as string) ||
      (config.entry_explanation_long as string) ||
      (config.entry_explanation as string) ||
      '',
    shortExplanation:
      (shortConfig.entry_explanation_short as string) ||
      (config.entry_explanation_short as string) ||
      (config.short_explanation as string) ||
      '',
    exitTypeLong:
      (longConfig.exit_type_position_long as string) ||
      (config.exit_type_long as string) ||
      'percentage',
    exitTypeShort:
      (shortConfig.exit_type_position_short as string) ||
      (config.exit_type_short as string) ||
      'percentage',
    tpLong: numericString(longConfig.tp_long ?? config.tp_long),
    slLong: numericString(longConfig.sl_long ?? config.sl_long),
    tpShort: numericString(shortConfig.tp_short ?? config.tp_short),
    slShort: numericString(shortConfig.sl_short ?? config.sl_short),
    atrPeriodLong: numericString((longConfig.atr_config_long as Record<string, unknown>)?.period),
    atrPeriodShort: numericString((shortConfig.atr_config_short as Record<string, unknown>)?.period)
  };
}

function createEmptyForm(): FormState {
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

function mapIndicators(config: Record<string, unknown>): IndicatorEntry[] {
  const indicatorConfigs =
    (config.indicator_configs as Record<string, Record<string, unknown>>) || {};
  return Object.entries(indicatorConfigs)
    .filter(([, params]) => typeof params === 'object' && params !== null)
    .map(([key, params]) => {
      const cleanParams: Record<string, string> = {};
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
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

function buildSubmissionPayload(form: FormState, indicators: IndicatorEntry[]): BacktestSubmissionPayload {
  const indicatorConfigs = indicators.reduce<Record<string, Record<string, unknown>>>((acc, entry) => {
    const key = entry.alias.trim() || entry.abbr;
    if (!key) return acc;
    const params: Record<string, unknown> = {};
    Object.entries(entry.params).forEach(([paramKey, value]) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const numeric = Number(trimmed);
      params[paramKey] = Number.isNaN(numeric) ? trimmed : numeric;
    });
    acc[key] = params;
    return acc;
  }, {});

  const payload: BacktestSubmissionPayload = {
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

function indicatorAlias(abbr: string, existing: IndicatorEntry[]): string {
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

function filterSymbols(symbols: SymbolOption[], query: string): SymbolOption[] {
  const term = query.trim().toLowerCase();
  if (!term) return symbols;
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

export default function SubmitBacktestPage({ user }: SubmitBacktestPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modifyIdParam = searchParams.get('id');
  const modifyId = modifyIdParam ? Number(modifyIdParam) : undefined;

  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [indicatorEntries, setIndicatorEntries] = useState<IndicatorEntry[]>([]);
  const [catalogIndicators, setCatalogIndicators] = useState<IndicatorOption[]>([]);
  const [symbolOptions, setSymbolOptions] = useState<SymbolOption[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<string>('free');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [symbolTagFilter, setSymbolTagFilter] = useState<string>('');

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
      const response: BacktestFormResponse = await fetchBacktestForm(user.id, {
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
      } else {
        setForm(createEmptyForm());
        setIndicatorEntries([]);
        setStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backtest form');
    } finally {
      setLoading(false);
    }
  }, [user.id, modifyId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, STEPS.length));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleSymbol = (symbol: string) => {
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

  const handleIndicatorAdd = (indicator: IndicatorOption) => {
    setIndicatorEntries((prev) => {
      const alias = indicatorAlias(indicator.abbr, prev);
      const defaults: Record<string, string> = {};
      Object.entries(indicator.defaults || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
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

  const handleIndicatorParamChange = (id: string, key: string, value: string) => {
    setIndicatorEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, params: { ...entry.params, [key]: value } } : entry))
    );
  };

  const handleIndicatorAliasChange = (id: string, alias: string) => {
    setIndicatorEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, alias } : entry))
    );
  };

  const handleIndicatorRemove = (id: string) => {
    setIndicatorEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleToggleLong = (checked: boolean) => {
    setForm((prev) => {
      if (!checked && !prev.shortEnabled) {
        return prev;
      }
      return { ...prev, longEnabled: checked };
    });
  };

  const handleToggleShort = (checked: boolean) => {
    setForm((prev) => {
      if (!checked && !prev.longEnabled) {
        return prev;
      }
      return { ...prev, shortEnabled: checked };
    });
  };

  const submit = useCallback(
    async (payload: BacktestSubmissionPayload): Promise<SubmitBacktestResponse | void> => {
      setSubmitting(true);
      setError(null);
      try {
        if (modifyId) {
          return await updateBacktest(user.id, modifyId, payload);
        }
        return await submitBacktest(user.id, payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit backtest');
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [modifyId, user.id]
  );

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
      if (!form.longEnabled && !form.shortEnabled) return false;
      if (form.longEnabled && !form.longExplanation.trim()) return false;
      if (form.shortEnabled && !form.shortExplanation.trim()) return false;
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
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading form…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, color: '#111827' }}>
          {modifyId ? 'Modify Backtest' : 'Submit Backtest'}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
          Follow the steps to configure your strategy. Subscription: {subscription}
        </p>
      </header>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {STEPS.map((meta) => {
          const isActive = meta.id === step;
          const isComplete = meta.id < step;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => setStep(meta.id)}
              style={{
                flex: '1 1 160px',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: isActive ? '#2563eb' : isComplete ? '#bfdbfe' : '#e5e7eb',
                background: isActive ? '#eff6ff' : isComplete ? '#f8fafc' : '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280' }}>Step {meta.id}</div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{meta.title}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{meta.description}</div>
            </button>
          );
        })}
      </nav>

      {error && (
        <div style={{ padding: 16, borderRadius: 12, background: '#fee2e2', color: '#991b1b' }}>{error}</div>
      )}

      {step === 1 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Backtest Name</span>
              <input
                type="text"
                value={form.backtestName}
                onChange={(event) => setForm((prev) => ({ ...prev, backtestName: event.target.value }))}
                placeholder="e.g. Momentum July"
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Universe</span>
              <select
                value={form.universe}
                onChange={(event) => setForm((prev) => ({ ...prev, universe: event.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              >
                <option value="stocks">Stocks</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Timeframe</span>
              <select
                value={form.timeframe}
                onChange={(event) => setForm((prev) => ({ ...prev, timeframe: event.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minute</option>
                <option value="15m">15 Minute</option>
                <option value="30m">30 Minute</option>
                <option value="1h">1 Hour</option>
                <option value="1d">1 Day</option>
                <option value="1wk">1 Week</option>
                <option value="1mo">1 Month</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Quick Filter</span>
              <input
                type="text"
                value={symbolFilter}
                onChange={(event) => setSymbolFilter(event.target.value)}
                placeholder="Search symbol, name, industry"
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
            <label style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Filter by tag</span>
              <select
                value={symbolTagFilter}
                onChange={(event) => setSymbolTagFilter(event.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Available</h3>
              <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
                {filteredSymbols.map((symbol) => {
                  const checked = form.selectedSymbols.includes(symbol.symbol);
                  return (
                    <label
                      key={symbol.symbol}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        background: checked ? '#eff6ff' : '#fff'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSymbol(symbol.symbol)}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{symbol.symbol}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{symbol.name}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Selected ({form.selectedSymbols.length})</h3>
              <div style={{
                minHeight: 120,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8
              }}>
                {form.selectedSymbols.map((symbol) => (
                  <span
                    key={symbol}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: 12
                    }}
                  >
                    {symbol}
                    <button
                      type="button"
                      onClick={() => toggleSymbol(symbol)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#1d4ed8',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.longEnabled} onChange={(event) => handleToggleLong(event.target.checked)} />
              <span style={{ fontWeight: 600 }}>Enable Long Trades</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.shortEnabled} onChange={(event) => handleToggleShort(event.target.checked)} />
              <span style={{ fontWeight: 600 }}>Enable Short Trades</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Indicators</h3>
              <select
                onChange={(event) => {
                  const selected = catalogIndicators.find((item) => item.abbr === event.target.value);
                  if (selected) {
                    handleIndicatorAdd(selected);
                  }
                  event.target.selectedIndex = 0;
                }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                defaultValue=""
              >
                <option value="" disabled>
                  Add indicator…
                </option>
                {catalogIndicators.map((indicator) => (
                  <option key={indicator.abbr} value={indicator.abbr}>
                    {indicator.abbr} · {indicator.full}
                  </option>
                ))}
              </select>
            </div>

            {indicatorEntries.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 12, border: '1px dashed #d1d5db', color: '#6b7280' }}>
                No indicators added yet. Use the dropdown to add one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {indicatorEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{entry.abbr}</strong>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Alias
                        <input
                          type="text"
                          value={entry.alias}
                          onChange={(event) => handleIndicatorAliasChange(entry.id, event.target.value)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleIndicatorRemove(entry.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #fecaca',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                      {Object.entries(entry.params).map(([key, value]) => (
                        <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{key}</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(event) => handleIndicatorParamChange(entry.id, key, event.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.longEnabled && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Long Entry Explanation</span>
              <textarea
                value={form.longExplanation}
                onChange={(event) => setForm((prev) => ({ ...prev, longExplanation: event.target.value }))}
                placeholder="Describe how the AI should identify long entries"
                rows={4}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
          )}

          {form.shortEnabled && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Short Entry Explanation</span>
              <textarea
                value={form.shortExplanation}
                onChange={(event) => setForm((prev) => ({ ...prev, shortExplanation: event.target.value }))}
                placeholder="Describe how the AI should identify short entries"
                rows={4}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
          )}
        </section>
      )}

      {step === 3 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Starting Balance</span>
              <input
                type="number"
                min={0}
                value={form.startingBalance}
                onChange={(event) => setForm((prev) => ({ ...prev, startingBalance: event.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>USD per Trade</span>
              <input
                type="number"
                min={0}
                value={form.usdPerTrade}
                onChange={(event) => setForm((prev) => ({ ...prev, usdPerTrade: event.target.value }))}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.preventOverlap}
              onChange={(event) => setForm((prev) => ({ ...prev, preventOverlap: event.target.checked }))}
            />
            Prevent overlapping trades per symbol
          </label>

          {(hasLong || hasShort) && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {hasLong && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Max Candles (Long)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.maxCandlesLong}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxCandlesLong: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                </label>
              )}
              {hasShort && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Max Candles (Short)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.maxCandlesShort}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxCandlesShort: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                </label>
              )}
            </div>
          )}

          {(hasLong || hasShort) && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {hasLong && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Long Exit Type</span>
                  <select
                    value={form.exitTypeLong}
                    onChange={(event) => setForm((prev) => ({ ...prev, exitTypeLong: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  >
                    <option value="percentage">Percentage Based</option>
                    <option value="atr">ATR Based</option>
                  </select>
                </label>
              )}
              {hasShort && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Short Exit Type</span>
                  <select
                    value={form.exitTypeShort}
                    onChange={(event) => setForm((prev) => ({ ...prev, exitTypeShort: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  >
                    <option value="percentage">Percentage Based</option>
                    <option value="atr">ATR Based</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {(hasLong || hasShort) && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {hasLong && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Long Take Profit (%)</span>
                    <input
                      type="number"
                      value={form.tpLong}
                      onChange={(event) => setForm((prev) => ({ ...prev, tpLong: event.target.value }))}
                      style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Long Stop Loss (%)</span>
                    <input
                      type="number"
                      value={form.slLong}
                      onChange={(event) => setForm((prev) => ({ ...prev, slLong: event.target.value }))}
                      style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                    />
                  </label>
                </>
              )}
              {hasShort && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Short Take Profit (%)</span>
                    <input
                      type="number"
                      value={form.tpShort}
                      onChange={(event) => setForm((prev) => ({ ...prev, tpShort: event.target.value }))}
                      style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Short Stop Loss (%)</span>
                    <input
                      type="number"
                      value={form.slShort}
                      onChange={(event) => setForm((prev) => ({ ...prev, slShort: event.target.value }))}
                      style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {(hasLong && form.exitTypeLong === 'atr') || (hasShort && form.exitTypeShort === 'atr') ? (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {hasLong && form.exitTypeLong === 'atr' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>ATR Period (Long)</span>
                  <input
                    type="number"
                    value={form.atrPeriodLong}
                    onChange={(event) => setForm((prev) => ({ ...prev, atrPeriodLong: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                </label>
              )}
              {hasShort && form.exitTypeShort === 'atr' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>ATR Period (Short)</span>
                  <input
                    type="number"
                    value={form.atrPeriodShort}
                    onChange={(event) => setForm((prev) => ({ ...prev, atrPeriodShort: event.target.value }))}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                </label>
              )}
            </div>
          ) : null}
        </section>
      )}

      {step === 4 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Name</div>
              <div style={{ fontWeight: 600 }}>{form.backtestName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Universe</div>
              <div style={{ fontWeight: 600 }}>{form.universe}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Timeframe</div>
              <div style={{ fontWeight: 600 }}>{form.timeframe}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Symbols</div>
              <div style={{ fontWeight: 600 }}>{form.selectedSymbols.join(', ') || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Starting Balance</div>
              <div style={{ fontWeight: 600 }}>${form.startingBalance || '0'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>USD per Trade</div>
              <div style={{ fontWeight: 600 }}>${form.usdPerTrade || '0'}</div>
            </div>
          </div>

          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <h3 style={{ margin: 0 }}>Indicators</h3>
            {indicatorEntries.length === 0 ? (
              <p style={{ margin: 0, color: '#6b7280' }}>No indicators selected.</p>
            ) : (
              indicatorEntries.map((entry) => (
                <div key={entry.id} style={{ fontSize: 14 }}>
                  <strong>{entry.alias}</strong>: {Object.entries(entry.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                </div>
              ))
            )}
          </div>

          {(hasLong && form.longExplanation.trim()) || (hasShort && form.shortExplanation.trim()) ? (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <h3 style={{ margin: 0 }}>Narrative</h3>
              {hasLong && form.longExplanation.trim() && (
                <div>
                  <strong>Long Entry Guidance</strong>
                  <p style={{ margin: '4px 0 0' }}>{form.longExplanation.trim()}</p>
                </div>
              )}
              {hasShort && form.shortExplanation.trim() && (
                <div>
                  <strong>Short Entry Guidance</strong>
                  <p style={{ margin: '4px 0 0' }}>{form.shortExplanation.trim()}</p>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={step === 1 || submitting}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#111827',
            cursor: step === 1 || submitting ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid || submitting}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: isStepValid ? '#2563eb' : '#a5b4fc',
              color: '#fff',
              cursor: !isStepValid || submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting…' : modifyId ? 'Update Backtest' : 'Submit Backtest'}
          </button>
        )}
      </footer>
    </div>
  );
}
