import type {
  AccountInfo,
  AdminTrainAIBootstrap,
  AdminTrainAIFeedbackPayload,
  AdminTrainAIFeedbackResponse,
  AdminTrainAIResponse,
  BacktestDetail,
  BacktestFormResponse,
  BacktestListResponse,
  BacktestSubmissionPayload,
  CheckoutSessionResponse,
  MessageResponse,
  PortalSessionResponse,
  PricingResponse,
  SubmitBacktestResponse,
  User,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export { API_BASE_URL };

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail
              .map((item: unknown) => (typeof item === "string" ? item : JSON.stringify(item)))
              .join(", ")
          : data.detail;
      }
    } catch (error) {
      console.error("Failed to parse error response", error);
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function signup(email: string, password: string): Promise<User> {
  return request<User>("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<User> {
  return request<User>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `${path}?${query}` : path;
}

export function listBacktests(
  userId: number,
  params: { q?: string; status?: string } = {},
): Promise<BacktestListResponse> {
  const endpoint = withQuery("/backtests/", { user_id: userId, ...params });
  return request<BacktestListResponse>(endpoint, { method: "GET" });
}

export function retryBacktest(userId: number, backtestId: number): Promise<{ message: string }> {
  const endpoint = withQuery(`/backtests/${backtestId}/retry`, { user_id: userId });
  return request<{ message: string }>(endpoint, { method: "POST" });
}

export function deleteBacktest(userId: number, backtestId: number): Promise<void> {
  const endpoint = withQuery(`/backtests/${backtestId}`, { user_id: userId });
  return request<void>(endpoint, { method: "DELETE" });
}

export function fetchBacktestDetail(userId: number, backtestId: number): Promise<BacktestDetail> {
  const endpoint = withQuery(`/backtests/${backtestId}`, { user_id: userId });
  return request<BacktestDetail>(endpoint, { method: "GET" });
}

export function fetchAccount(userId: number): Promise<AccountInfo> {
  const endpoint = withQuery("/account", { user_id: userId });
  return request<AccountInfo>(endpoint, { method: "GET" });
}

export function fetchPricing(userId?: number | null): Promise<PricingResponse> {
  const endpoint = withQuery("/billing/pricing", { user_id: userId ?? undefined });
  return request<PricingResponse>(endpoint, { method: "GET" });
}

export function createCheckoutSession(userId: number): Promise<CheckoutSessionResponse> {
  const endpoint = withQuery("/billing/create-checkout-session", { user_id: userId });
  return request<CheckoutSessionResponse>(endpoint, { method: "POST" });
}

export function createBillingPortalSession(userId: number): Promise<PortalSessionResponse> {
  const endpoint = withQuery("/billing/create-portal-session", { user_id: userId });
  return request<PortalSessionResponse>(endpoint, { method: "POST" });
}

export function completeCheckout(userId: number, sessionId?: string | null): Promise<MessageResponse> {
  const endpoint = withQuery("/billing/success", {
    user_id: userId,
    session_id: sessionId ?? undefined,
  });
  return request<MessageResponse>(endpoint, { method: "GET" });
}

export function cancelCheckout(): Promise<MessageResponse> {
  return request<MessageResponse>("/billing/cancel", { method: "GET" });
}

export function exchangeGoogleToken(token: string): Promise<User> {
  const endpoint = withQuery("/auth/google/exchange", { token });
  return request<User>(endpoint, { method: "GET" });
}

export function fetchBacktestForm(
  userId: number,
  params: { backtestId?: number | null },
): Promise<BacktestFormResponse> {
  const endpoint = withQuery("/backtests/form", {
    user_id: userId,
    backtest_id: params.backtestId ?? undefined,
  });
  return request<BacktestFormResponse>(endpoint, { method: "GET" });
}

export function submitBacktest(
  userId: number,
  payload: BacktestSubmissionPayload,
): Promise<SubmitBacktestResponse> {
  const endpoint = withQuery("/backtests/submit", { user_id: userId });
  return request<SubmitBacktestResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBacktest(
  userId: number,
  backtestId: number,
  payload: BacktestSubmissionPayload,
): Promise<SubmitBacktestResponse> {
  const endpoint = withQuery(`/backtests/${backtestId}`, { user_id: userId });
  return request<SubmitBacktestResponse>(endpoint, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminTrainAIBootstrap(userId: number): Promise<AdminTrainAIBootstrap> {
  const endpoint = withQuery("/admin/train-ai/bootstrap", { user_id: userId });
  return request<AdminTrainAIBootstrap>(endpoint, { method: "GET" });
}

interface AdminTrainAIPayload {
  long_enabled: boolean;
  short_enabled: boolean;
  entry_explanation: string;
  short_explanation: string;
  indicator_configs: Record<string, Record<string, unknown>>;
}

export function generateAdminTrainAI(
  userId: number,
  payload: AdminTrainAIPayload,
): Promise<AdminTrainAIResponse> {
  const endpoint = withQuery("/admin/train-ai/generate", { user_id: userId });
  return request<AdminTrainAIResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitAdminTrainAIFeedback(
  userId: number,
  payload: AdminTrainAIFeedbackPayload,
): Promise<AdminTrainAIFeedbackResponse> {
  const endpoint = withQuery("/admin/train-ai/feedback", { user_id: userId });
  return request<AdminTrainAIFeedbackResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
