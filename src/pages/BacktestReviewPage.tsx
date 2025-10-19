import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchBacktestDetail } from '../api/client';
import type {
  BacktestAiEntryConfig,
  BacktestConfig,
  BacktestDetail,
  EquityPoint,
  User
} from '../types';

interface BacktestReviewPageProps {
  user: User;
}

interface HeadlineMetric {
  label: string;
  value: string;
  tone: 'pos' | 'neg' | null;
}

interface MetricItem {
  label: string;
  value: string;
  negative: boolean;
  unit?: string | null;
}

interface MetricGroup {
  group: string;
  items: MetricItem[];
}

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

const UNIT_SUFFIXES: Record<string, string> = {
  Average_Holding_Period: 'Candles'
};

const SPECIAL_LABELS: Record<string, string> = {
  final_pnl: 'Final PnL',
  Average_Profit_per_Trade: 'Average Profit per Trade'
};

const METRIC_GROUPS: Array<{ group: string; keys: string[] }> = [
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

function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  } catch (error) {
    console.warn('Currency formatting failed', error);
    return value.toFixed(2);
  }
}

function formatPercent(raw: number): string {
  const scaled = Math.abs(raw) > 1 ? raw : raw * 100;
  return `${scaled.toFixed(2)}%`;
}

function formatNumber(raw: number): string {
  const normalized = Math.abs(raw) < 1e-10 ? 0 : raw;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0
  }).format(normalized);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDateTime(value: unknown): string | null {
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

function formatDateLabel(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }
  return value;
}

function formatHeadline(value: unknown, kind: 'int' | 'currency' | 'percent'): {
  display: string;
  tone: 'pos' | 'neg' | null;
} {
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

function humanLabel(key: string): string {
  return key.replace(/_/g, ' ');
}

function formatMetricValue(key: string, value: unknown): { formatted: string; negative: boolean } {
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
  if (
    key.includes('$') ||
    lowerKey.includes('usd') ||
    lowerKey.includes('balance') ||
    lowerKey.endsWith('_$') ||
    lowerKey.includes('profit_$') ||
    lowerKey === 'final_pnl' ||
    lowerKey === 'average_profit_per_trade'
  ) {
    return { formatted: formatCurrency(numeric), negative: numeric < 0 };
  }
  if (
    key.endsWith('_%') ||
    key.includes('%') ||
    lowerKey.includes('drawdown') ||
    lowerKey.includes('rate') ||
    lowerKey.includes('return')
  ) {
    return { formatted: formatPercent(numeric), negative: numeric < 0 };
  }
  if (lowerKey === 'number_of_trades') {
    return { formatted: Math.round(numeric).toLocaleString(), negative: numeric < 0 };
  }
  return { formatted: formatNumber(numeric), negative: numeric < 0 };
}

function buildMetricGroups(summary: Record<string, unknown>): MetricGroup[] {
  const seen = new Set<string>();
  const groups: MetricGroup[] = [];

  for (const { group, keys } of METRIC_GROUPS) {
    const items: MetricItem[] = [];
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

  const extras: MetricItem[] = [];
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

function buildHeadlineMetrics(summary: Record<string, unknown>): HeadlineMetric[] {
  const trades = formatHeadline(summary['Number_of_Trades'] ?? summary['total_trades'], 'int');
  const profit = formatHeadline(
    summary['final_pnl'] ?? summary['Total_Return_Profit_$'] ?? summary['Profit_$'] ?? summary['Total_Return_$'],
    'currency'
  );
  const annualized = formatHeadline(summary['Annualized_Return'], 'percent');
  return [
    { label: 'Total trades', value: trades.display, tone: trades.tone },
    { label: 'Final PnL', value: profit.display, tone: profit.tone },
    { label: 'Annualized Return', value: annualized.display, tone: annualized.tone }
  ];
}

function formatTradeNumber(value: number): string {
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0
  }).format(normalized);
}

function formatTradeCell(value: unknown): string {
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

function resolveTradeColumns(columns: string[]): string[] {
  const lowerToOriginal = new Map(columns.map((col) => [col.toLowerCase(), col] as const));
  const resolved = PRIORITY_COLUMNS.map((key) => lowerToOriginal.get(key));
  return resolved.filter((col): col is string => Boolean(col));
}

function SimpleLineChart({
  values,
  color,
  fill
}: {
  values: number[];
  color: string;
  fill?: string;
}) {
  if (!values.length) {
    return <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No data</div>;
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

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 200 }}>
      {fill && <polygon points={polygonPoints} fill={fill} opacity={0.25} />}
      <polyline points={points.join(' ')} stroke={color} strokeWidth={2.5} fill="none" />
    </svg>
  );
}

function SimpleBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  if (!values.length) {
    return <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No data</div>;
  }
  const max = Math.max(...values) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '12px 4px 0' }}>
      {values.map((value, index) => {
        const height = (value / max) * 100;
        return (
          <div key={labels[index] ?? index} style={{ flex: 1, minWidth: 16 }}>
            <div
              style={{
                height: `${height}%`,
                background: '#2563eb',
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.2s ease'
              }}
            />
            <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#475569' }}>{labels[index]}</div>
            <div style={{ marginTop: 4, textAlign: 'center', fontSize: 11, color: '#0f172a' }}>{value}</div>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.warn('Copy failed', error);
      setCopied(false);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid #c7d2fe',
        background: copied ? '#e0e7ff' : '#fff',
        color: '#1d4ed8',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {copied ? 'Copied!' : 'Copy' }
    </button>
  );
}

function aiConfig(config: BacktestConfig): BacktestAiEntryConfig {
  if (config && typeof config.ai_entry === 'object' && config.ai_entry !== null) {
    return config.ai_entry as BacktestAiEntryConfig;
  }
  return {};
}

function BacktestReviewPage({ user }: BacktestReviewPageProps) {
  const navigate = useNavigate();
  const params = useParams<{ backtestId: string }>();
  const numericId = Number(params.backtestId);
  const [detail, setDetail] = useState<BacktestDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
  const config: BacktestConfig = safeDetail?.config ?? {};
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

  const longEntryText = safeDetail?.entry_text_long ?? (config.long_config?.entry_explanation_long as string | undefined) ?? null;
  const shortEntryText = safeDetail?.entry_text_short ?? (config.short_config?.entry_explanation_short as string | undefined) ?? null;

  const longCondition = typeof entryConfig.condition_code_long === 'string' ? entryConfig.condition_code_long.trim() : '';
  const shortCondition = typeof entryConfig.condition_code_short === 'string' ? entryConfig.condition_code_short.trim() : '';

  const longOffset = entryConfig.offset_long ?? '—';
  const shortOffset = entryConfig.offset_short ?? '—';

  const longExitType = (config.long_config?.exit_type_position_long as string | undefined) ?? null;
  const shortExitType = (config.short_config?.exit_type_position_short as string | undefined) ?? null;

  const longAtrPeriod = config.long_config?.atr_config_long && typeof config.long_config.atr_config_long === 'object'
    ? (config.long_config.atr_config_long as { period?: number | null }).period ?? null
    : null;
  const shortAtrPeriod = config.short_config?.atr_config_short && typeof config.short_config.atr_config_short === 'object'
    ? (config.short_config.atr_config_short as { period?: number | null }).period ?? null
    : null;

  const tradesColumns = useMemo(
    () => resolveTradeColumns(safeDetail?.trades_columns ?? []),
    [safeDetail?.trades_columns]
  );

  const tradeDuration = useMemo(() => {
    const raw = summary['Trade_Duration_Distribution'];
    if (!raw || typeof raw !== 'object') {
      return { labels: [] as string[], values: [] as number[] };
    }
    const entries: Array<{ label: string; value: number }> = [];
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

  const equityValues = useMemo(
    () => (safeDetail?.equity_curve ?? []).map((point: EquityPoint) => point.balance),
    [safeDetail?.equity_curve]
  );
  const equityLabels = useMemo(
    () => (safeDetail?.equity_curve ?? []).map((point: EquityPoint) => formatDateLabel(point.date)),
    [safeDetail?.equity_curve]
  );

  const drawdownValues = useMemo(
    () => (safeDetail?.drawdown_curve ?? []).map((value) => (typeof value === 'number' ? value * 100 : 0)),
    [safeDetail?.drawdown_curve]
  );

  const firstEquityLabel = equityLabels[0] ?? '';
  const lastEquityLabel = equityLabels[equityLabels.length - 1] ?? '';

  const participatedSymbols = safeDetail?.participated_symbols ?? [];
  const selectedSymbols = (config.selected_symbols ?? []).filter((sym) => typeof sym === 'string');

  if (loading) {
    return <div style={{ color: '#6b7280' }}>Loading backtest review…</div>;
  }

  if (error) {
    return (
      <div style={{ color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span>{error}</span>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{ alignSelf: 'flex-start', border: 'none', background: '#2563eb', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!safeDetail) {
    return (
      <div style={{ color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span>Backtest details not available.</span>
        <span style={{ fontSize: 12 }}>
          If this persists, confirm the backtest files exist under `beckend/app/data/customer_data/{user.id}/{numericId}` and the API returns
          data for `/backtests/{numericId}?user_id={user.id}`.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: '1px solid #cbd5f5',
            background: '#edf2ff',
            color: '#1d4ed8',
            padding: '8px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {detail.backtest_name ?? `Backtest #${detail.id}`}
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Created {formatDateTime(createdAtText) ?? '—'}</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center'
        }}
      >
        <span
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            background:
              detail.status === 'completed'
                ? '#dcfce7'
                : detail.status === 'failed'
                ? '#fee2e2'
                : '#e0e7ff',
            color:
              detail.status === 'completed'
                ? '#166534'
                : detail.status === 'failed'
                ? '#b91c1c'
                : '#312e81',
            fontWeight: 600,
            textTransform: 'capitalize'
          }}
        >
          {detail.status}
        </span>
        {savedAtText && (
          <span style={{ color: '#475569' }}>Saved {formatDateTime(savedAtText) ?? savedAtText}</span>
        )}
        <button
          type="button"
          onClick={() => navigate(`/submit_backtest?id=${detail.id}`)}
          style={{
            marginLeft: 'auto',
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '8px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Modify backtest
        </button>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <details open style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1d4ed8', fontSize: 16 }}>
            Strategy settings
          </summary>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(startingBalanceDisplay || perTradeDisplay) && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {startingBalanceDisplay && (
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Starting Balance</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{startingBalanceDisplay}</div>
                  </div>
                )}
                {perTradeDisplay && (
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Per Trade USD</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{perTradeDisplay}</div>
                  </div>
                )}
              </div>
            )}

            {selectedSymbols.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Selected Symbols ({selectedSymbols.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedSymbols.map((symbol) => (
                    <span
                      key={symbol}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#f1f5f9',
                        color: '#0f172a',
                        fontSize: 13
                      }}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {participatedSymbols.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Participated Symbols ({participatedSymbols.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {participatedSymbols.map((symbol) => (
                    <span
                      key={symbol}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#ede9fe',
                        color: '#5b21b6',
                        fontSize: 13
                      }}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#1d4ed8' }}>Entry conditions</h3>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
                  Long Entry (offset: {String(longOffset)})
                </div>
                {longEnabled ? (
                  <>
                    {longEntryText && (
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, marginRight: 6 }}>
                          User description
                        </span>
                        {longEntryText}
                      </div>
                    )}
                    {longCondition && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <CopyButton text={longCondition} />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Copy generated code</span>
                      </div>
                    )}
                    <pre
                      style={{
                        margin: 0,
                        padding: '12px 16px',
                        background: '#0f172a',
                        color: '#e2e8f0',
                        borderRadius: 12,
                        maxHeight: 180,
                        overflow: 'auto',
                        fontSize: 13
                      }}
                    >
                      {longCondition || 'Not trading long'}
                    </pre>
                  </>
                ) : (
                  <div style={{ color: '#f87171' }}>Long trading disabled</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
                  Short Entry (offset: {String(shortOffset)})
                </div>
                {shortEnabled ? (
                  <>
                    {shortEntryText && (
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, marginRight: 6 }}>
                          User description
                        </span>
                        {shortEntryText}
                      </div>
                    )}
                    {shortCondition && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <CopyButton text={shortCondition} />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Copy generated code</span>
                      </div>
                    )}
                    <pre
                      style={{
                        margin: 0,
                        padding: '12px 16px',
                        background: '#111827',
                        color: '#e2e8f0',
                        borderRadius: 12,
                        maxHeight: 180,
                        overflow: 'auto',
                        fontSize: 13
                      }}
                    >
                      {shortCondition || 'Not trading short'}
                    </pre>
                  </>
                ) : (
                  <div style={{ color: '#f87171' }}>Short trading disabled</div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <div>
                <h3 style={{ margin: '16px 0 12px', fontSize: 16, color: '#1d4ed8' }}>Long exit</h3>
                {longEnabled && longExitType ? (
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 14, lineHeight: 1.6 }}>
                    <li>Type: {longExitType === 'atr' ? 'ATR' : 'Percentage'}</li>
                    {longExitType === 'atr' ? (
                      <>
                        {longAtrPeriod !== null && <li>ATR Period: {longAtrPeriod}</li>}
                        {config.long_config?.tp_long !== undefined && config.long_config?.tp_long !== null && (
                          <li>TP (ATR multiple): {config.long_config?.tp_long}</li>
                        )}
                        {config.long_config?.sl_long !== undefined && config.long_config?.sl_long !== null && (
                          <li>SL (ATR multiple): {config.long_config?.sl_long}</li>
                        )}
                      </>
                    ) : (
                      <>
                        {config.long_config?.tp_long !== undefined && config.long_config?.tp_long !== null && (
                          <li>TP %: {config.long_config?.tp_long}</li>
                        )}
                        {config.long_config?.sl_long !== undefined && config.long_config?.sl_long !== null && (
                          <li>SL %: {config.long_config?.sl_long}</li>
                        )}
                      </>
                    )}
                  </ul>
                ) : (
                  <div style={{ color: '#64748b' }}>No long exit configuration.</div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '16px 0 12px', fontSize: 16, color: '#1d4ed8' }}>Short exit</h3>
                {shortEnabled && shortExitType ? (
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 14, lineHeight: 1.6 }}>
                    <li>Type: {shortExitType === 'atr' ? 'ATR' : 'Percentage'}</li>
                    {shortExitType === 'atr' ? (
                      <>
                        {shortAtrPeriod !== null && <li>ATR Period: {shortAtrPeriod}</li>}
                        {config.short_config?.tp_short !== undefined && config.short_config?.tp_short !== null && (
                          <li>TP (ATR multiple): {config.short_config?.tp_short}</li>
                        )}
                        {config.short_config?.sl_short !== undefined && config.short_config?.sl_short !== null && (
                          <li>SL (ATR multiple): {config.short_config?.sl_short}</li>
                        )}
                      </>
                    ) : (
                      <>
                        {config.short_config?.tp_short !== undefined && config.short_config?.tp_short !== null && (
                          <li>TP %: {config.short_config?.tp_short}</li>
                        )}
                        {config.short_config?.sl_short !== undefined && config.short_config?.sl_short !== null && (
                          <li>SL %: {config.short_config?.sl_short}</li>
                        )}
                      </>
                    )}
                  </ul>
                ) : (
                  <div style={{ color: '#64748b' }}>No short exit configuration.</div>
                )}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <details style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0f172a', fontSize: 16 }}>
            Last 10 trades
          </summary>
          <div style={{ marginTop: 16 }}>
            {detail.trades_preview?.length && tradesColumns.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b', fontSize: 13 }}>
                      {tradesColumns.map((column) => (
                        <th key={column} style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {humanLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.trades_preview.slice(-10).map((row, index) => (
                      <tr key={index} style={{ borderTop: '1px solid #e2e8f0' }}>
                        {tradesColumns.map((column) => {
                          const value = row[column] ?? row[column.toLowerCase()];
                          const lower = column.toLowerCase();
                          const rawText = formatTradeCell(value);
                          const isPnL = lower === 'pnl';
                          const numeric = parseNumber(value);
                          const color = numeric !== null && isPnL ? (numeric < 0 ? '#dc2626' : numeric > 0 ? '#16a34a' : '#0f172a') : '#0f172a';
                          const positionStatus = lower === 'position_status' ? String(value ?? '') : null;
                          const translated = positionStatus === 'LONG_POS' ? 'Long' : positionStatus === 'SHORT_POS' ? 'Short' : rawText;
                          return (
                            <td key={column} style={{ padding: '10px 12px', color, fontSize: 13 }}>
                              {translated}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px 0', color: '#64748b' }}>No trades found.</div>
            )}
          </div>
        </details>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {headlineMetrics.map((metric) => (
              <div key={metric.label} style={{ minWidth: 140 }}>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>{metric.label}</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: metric.tone === 'pos' ? '#16a34a' : metric.tone === 'neg' ? '#dc2626' : '#0f172a'
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>Equity curve</div>
            <SimpleLineChart values={equityValues} color="#2563eb" fill="#93c5fd" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 8 }}>
              <span>{firstEquityLabel}</span>
              <span>{lastEquityLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Results summary</h2>

        {metricGroups.length ? (
          metricGroups.map((group) => (
            <div key={group.group} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8' }}>{group.group}</div>
              <div
                style={{
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
                }}
              >
                {group.items.map((item) => (
                  <div
                    key={`${group.group}-${item.label}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '12px 16px',
                      background: '#f8fafc'
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: item.negative ? '#dc2626' : '#0f172a'
                      }}
                    >
                      {item.value}
                      {item.unit && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>{item.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: 16, borderRadius: 12, background: '#f1f5f9', color: '#64748b' }}>
            No summary metrics available.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
          }}
        >
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>Drawdown</div>
            <SimpleLineChart values={drawdownValues} color="#dc2626" fill="#fca5a5" />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 8 }}>Values in %</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
              Trade duration distribution
            </div>
            <SimpleBarChart labels={tradeDuration.labels} values={tradeDuration.values} />
          </div>
        </div>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>What’s next?</div>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
          Want to iterate? Head over to the submit flow and tweak your inputs to optimize the next run. You can reuse the
          same configuration or start fresh with new symbols.
        </p>
      </section>
    </div>
  );
}

export default BacktestReviewPage;
