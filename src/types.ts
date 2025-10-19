export interface User {
  id: number;
  email: string;
  subscription: string;
}

export interface IndicatorCatalogItem {
  abbr: string;
  full: string;
  description: string;
  category: string;
  defaults: Record<string, unknown>;
  note?: string | null;
}

export interface AdminTrainAIBootstrap {
  indicators: IndicatorCatalogItem[];
}

export interface AdminTrainAISide {
  enabled: boolean;
  code?: string | null;
  offset?: number | null;
  prompt?: string | null;
  user_input?: string | null;
}

export interface AdminTrainAIResponse {
  ok: boolean;
  long: AdminTrainAISide;
  short: AdminTrainAISide;
  meta: {
    indicator_keys: string[];
    data_path: string;
    columns: string[];
    indicator_configs?: Record<string, Record<string, unknown>>;
    indicator_prompt_details?: Record<
      string,
      {
        base: string;
        params: Record<string, unknown>;
        columns: string[];
      }
    >;
  };
}

export interface AdminTrainAIFeedbackPayload {
  side: "long" | "short";
  code: string;
  rating: number;
  comment?: string | null;
  prompt?: string | null;
  indicator_keys?: string[];
  model?: string | null;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface AdminTrainAIFeedbackResponse {
  ok: boolean;
}

export interface ApiError {
  detail: string;
}

export type BacktestStatus = "pending" | "completed" | "failed" | string;

export interface BacktestListItem {
  id: number;
  backtest_name: string | null;
  status: BacktestStatus;
  created_at: string;
  pnl_pct: number | null;
  win_rate: number | null;
  avg_duration: string | null;
  spark: number[];
  config: Record<string, unknown>;
}

export interface BacktestSummary {
  latest_pnl: number | null;
  latest_win: number | null;
  latest_duration: string | null;
  count_total: number;
  count_completed: number;
  count_pending: number;
  count_failed: number;
}

export interface BacktestListResponse {
  items: BacktestListItem[];
  summary: BacktestSummary;
}

export interface AccountInfo {
  id: number;
  email: string;
  subscription: string;
  created_at: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string[];
  is_popular: boolean;
}

export interface PricingResponse {
  publishable_key: string | null;
  stripe_enabled: boolean;
  current_subscription: string | null;
  plans: BillingPlan[];
}

export interface CheckoutSessionResponse {
  session_id: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface MessageResponse {
  message: string;
  subscription?: string | null;
}

export interface BacktestAiEntryConfig {
  condition_code_long?: string | null;
  offset_long?: number | string | null;
  condition_code_short?: string | null;
  offset_short?: number | string | null;
  [key: string]: unknown;
}

export interface BacktestSideConfig {
  entry_explanation_long?: string | null;
  exit_type_position_long?: string | null;
  tp_long?: number | string | null;
  sl_long?: number | string | null;
  atr_config_long?: { period?: number | null } | null;
  entry_explanation_short?: string | null;
  exit_type_position_short?: string | null;
  tp_short?: number | string | null;
  sl_short?: number | string | null;
  atr_config_short?: { period?: number | null } | null;
  [key: string]: unknown;
}

export interface BacktestConfig {
  backtest_name?: string | null;
  saved_at_utc?: string | null;
  universe?: string | null;
  timeframe?: string | null;
  selected_symbols?: string[];
  starting_balance?: number | string | null;
  usd_per_trade?: number | string | null;
  max_candles_long?: number | string | null;
  max_candles_short?: number | string | null;
  prevent_overlap_per_symbol?: boolean;
  indicator_configs?: Record<string, unknown>;
  long_enabled?: boolean;
  short_enabled?: boolean;
  long_config?: BacktestSideConfig;
  short_config?: BacktestSideConfig;
  ai_entry?: BacktestAiEntryConfig;
  [key: string]: unknown;
}

export interface EquityPoint {
  date: string | null;
  balance: number;
}

export interface BacktestDetail {
  id: number;
  backtest_name: string | null;
  status: BacktestStatus;
  created_at: string;
  config: BacktestConfig;
  summary_metrics: Record<string, unknown>;
  equity_curve: EquityPoint[];
  drawdown_curve: number[];
  trades_preview: Array<Record<string, unknown>>;
  trades_columns: string[];
  participated_symbols: string[];
  saved_at_utc: string | null;
  entry_text_long: string | null;
  entry_text_short: string | null;
}

export interface IndicatorOption {
  abbr: string;
  full: string;
  description: string;
  category: string;
  defaults: Record<string, unknown>;
}

export interface SymbolOption {
  symbol: string;
  name: string;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  tags: string[];
}

export interface BacktestFormResponse {
  mode: "new" | "modify";
  indicators: IndicatorOption[];
  symbols: SymbolOption[];
  tags: string[];
  subscription: string;
  config: Record<string, unknown>;
}

export interface BacktestSubmissionPayload {
  backtest_name: string;
  universe: string;
  timeframe: string;
  selected_symbols: string[];
  starting_balance: number;
  usd_per_trade: number;
  prevent_overlap_per_symbol: boolean;
  indicator_configs: Record<string, Record<string, unknown>>;
  long_enabled: boolean;
  short_enabled: boolean;
  entry_explanation?: string;
  short_explanation?: string;
  exit_type_long?: string;
  exit_type_short?: string;
  tp_long?: number | string | null;
  sl_long?: number | string | null;
  tp_short?: number | string | null;
  sl_short?: number | string | null;
  atr_config_long?: Record<string, unknown> | null;
  atr_config_short?: Record<string, unknown> | null;
  max_candles_long?: number | null;
  max_candles_short?: number | null;
  backtest_start_date?: string;
  backtest_end_date?: string;
  ai_entry?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SubmitBacktestResponse {
  backtest_id: number;
  message: string;
}
