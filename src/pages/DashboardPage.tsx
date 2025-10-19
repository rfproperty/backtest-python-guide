import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBacktests } from '../api/client';
import type { BacktestListItem, BacktestSummary, BacktestStatus, User } from '../types';

interface DashboardPageProps {
  user: User;
}

const STATUS_OPTIONS: { label: string; value: BacktestStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' }
];

const EMPTY_SUMMARY: BacktestSummary = {
  latest_pnl: null,
  latest_win: null,
  latest_duration: null,
  count_total: 0,
  count_completed: 0,
  count_pending: 0,
  count_failed: 0
};

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(2)}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BacktestStatus | 'all'>('all');
  const [items, setItems] = useState<BacktestListItem[]>([]);
  const [summary, setSummary] = useState<BacktestSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (nextSearch = search, nextStatus = status) => {
      setLoading(true);
      setError(null);
      try {
        const response = await listBacktests(user.id, {
          q: nextSearch || undefined,
          status: nextStatus === 'all' ? undefined : nextStatus
        });
        setItems(response.items);
        setSummary(response.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load backtests');
      } finally {
        setLoading(false);
      }
    },
    [search, status, user.id]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await fetchData(search, status);
    },
    [fetchData, search, status]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#111827' }}>Your Backtests</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Manage and monitor every run powered by Backtest AI.</p>
        </div>
        <button
          type="button"
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 18px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => navigate('/submit_backtest')}
        >
          🚀 New Backtest
        </button>
      </header>

      <section
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
        }}
      >
        <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Latest Return
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 700 }}>{formatPercent(summary.latest_pnl)}</p>
        </div>
        <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Latest Win Rate
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 700 }}>{formatPercent(summary.latest_win)}</p>
        </div>
        <div style={{ background: '#fef3c7', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Active Backtests
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 700 }}>{summary.count_total}</p>
          <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: 12 }}>
            {summary.count_completed} completed · {summary.count_pending} pending · {summary.count_failed} failed
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}
      >
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #d1d5db'
          }}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as BacktestStatus | 'all')}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db' }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '10px 16px',
            background: '#111827',
            color: '#fff',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Apply
        </button>
      </form>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Loading backtests…</div>
      ) : error ? (
        <div style={{ padding: 16, borderRadius: 12, background: '#fee2e2', color: '#991b1b' }}>{error}</div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: '1px dashed #cbd5f5',
            borderRadius: 16,
            textAlign: 'center',
            background: '#f8fafc'
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#111827' }}>No backtests yet</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Kick off your first run in under a minute.</p>
          <button
            type="button"
            onClick={() => navigate('/submit_backtest')}
            style={{
              marginTop: 16,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Start Backtest
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Backtest</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Results</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                    {item.backtest_name ?? `Backtest #${item.id}`}
                  </td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{formatDate(item.created_at)}</td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background:
                          item.status === 'completed'
                            ? '#dcfce7'
                            : item.status === 'failed'
                            ? '#fee2e2'
                            : '#e0e7ff',
                        color:
                          item.status === 'completed'
                            ? '#166534'
                            : item.status === 'failed'
                            ? '#b91c1c'
                            : '#312e81',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'capitalize'
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {item.status === 'completed' ? (
                      <a
                        href={`/backtests/${item.id}`}
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                      >
                        View results →
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Results unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
