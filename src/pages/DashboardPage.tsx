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
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Backtests</h1>
          <p className="mt-1 text-muted-foreground">Manage and monitor every run powered by Backtest AI.</p>
        </div>
        <button
          type="button"
          className="bg-gradient-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:shadow-glow transition-all"
          onClick={() => navigate('/submit_backtest')}
        >
          🚀 New Backtest
        </button>
      </header>

      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="bg-primary-light p-4 rounded-xl border border-primary/20">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            Latest Return
          </h3>
          <p className="mt-3 text-2xl font-bold text-foreground">{formatPercent(summary.latest_pnl)}</p>
        </div>
        <div className="bg-success-light p-4 rounded-xl border border-success/20">
          <h3 className="text-xs font-bold text-success uppercase tracking-wider">
            Latest Win Rate
          </h3>
          <p className="mt-3 text-2xl font-bold text-foreground">{formatPercent(summary.latest_win)}</p>
        </div>
        <div className="bg-warning-light p-4 rounded-xl border border-warning/20">
          <h3 className="text-xs font-bold text-warning uppercase tracking-wider">
            Active Backtests
          </h3>
          <p className="mt-3 text-2xl font-bold text-foreground">{summary.count_total}</p>
          <p className="mt-1 text-warning-foreground text-xs">
            {summary.count_completed} completed · {summary.count_pending} pending · {summary.count_failed} failed
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-3 items-center"
      >
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as BacktestStatus | 'all')}
          className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-all"
        >
          Apply
        </button>
      </form>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading backtests…</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-destructive-light text-destructive border border-destructive/20">{error}</div>
      ) : items.length === 0 ? (
        <div className="py-8 border-2 border-dashed border-border rounded-2xl text-center bg-muted">
          <div className="text-4xl mb-2">🚀</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No backtests yet</h2>
          <p className="text-muted-foreground mb-4">Kick off your first run in under a minute.</p>
          <button
            type="button"
            onClick={() => navigate('/submit_backtest')}
            className="px-5 py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all"
          >
            Start Backtest
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-muted-foreground text-sm bg-muted/50">
                <th className="py-3 px-4 font-semibold">Backtest</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Results</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-4 font-semibold text-foreground">
                    {item.backtest_name ?? `Backtest #${item.id}`}
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full font-semibold text-xs capitalize ${
                        item.status === 'completed'
                          ? 'bg-success-light text-success-foreground'
                          : item.status === 'failed'
                          ? 'bg-destructive-light text-destructive'
                          : 'bg-primary-light text-primary'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {item.status === 'completed' ? (
                      <a
                        href={`/backtests/${item.id}`}
                        className="text-primary font-semibold hover:text-primary-glow transition-colors"
                      >
                        View results →
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Results unavailable</span>
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
