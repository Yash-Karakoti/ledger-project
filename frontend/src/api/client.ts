/**
 * API Client — Communicates with the Ledger DCA Agent backend
 */

const BASE = "http://localhost:3001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
}

// Device APIs
export const deviceApi = {
  status: () => request<{ useSpeculos: boolean; speculosPort: number; derivationPath: string; connected: boolean }>("/device/status"),
  discover: () => request<{ sessionId: string; deviceName: string }>("/device/discover", { method: "POST" }),
  info: () => request<{ seVersion: string; mcuSephVersion: string }>("/device/info"),
  genuineCheck: () => request<{ isGenuine: boolean }>("/device/genuine-check", { method: "POST" }),
  address: (verify?: boolean) => request<{ address: string; publicKey: string }>(`/device/address?verify=${verify ?? true}`),
  disconnect: () => request<Record<string, unknown>>("/device/disconnect", { method: "POST" }),
};

// Market APIs
export const marketApi = {
  prices: () => request<{ ethUsd: number; usdcUsd: number; timestamp: number }>("/market/prices"),
  calculate: (amount: number, ethPrice: number, slippageBps?: number) =>
    request<{ usdcAmount: number; ethUsdPrice: number; slippageBps: number; estimatedEth: number; minEthOut: number; maxSlippageUsd: number }>(
      `/market/calculate?amount=${amount}&ethPrice=${ethPrice}&slippageBps=${slippageBps ?? 100}`,
    ),
};

// DCA APIs
export const dcaApi = {
  config: () => request<{ intervalHours: number; maxAmountUsdc: number; sourceToken: string; targetToken: string; slippageBps: number; dryRun: boolean }>("/dca/config"),
  updateConfig: (updates: Record<string, unknown>) =>
    request<Record<string, unknown>>("/dca/config", {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  execute: () =>
    request<{
      status: string;
      usdcAmount: number;
      estimatedEth: number;
      minEthOut: number;
      ethUsdPrice: number;
      timestamp: string;
      id: string;
      ethAccumulated: number;
      usdcSpent: number;
    }>("/dca/execute", { method: "POST" }),
  status: () => request<{ lastExecution: string | null }>("/dca/status"),
  history: (limit = 50) =>
    request<{
      records: Array<{
        id: string;
        timestamp: string;
        status: string;
        usdcAmount: number;
        estimatedEth: number;
        ethUsdPrice: number;
        ethAccumulated: number;
        usdcSpent: number;
        txHash?: string;
        error?: string;
        dryRun: boolean;
      }>;
    }>(`/dca/history?limit=${limit}`),
};

// Profile APIs
export const profileApi = {
  portfolio: () =>
    request<{
      totalUsdcSpent: number;
      totalEthAccumulated: number;
      currentValueUsd: number;
      avgEntryPrice: number;
      pnlUsd: number;
      pnlPercent: number;
      executionCount: number;
      lastExecution: string | null;
      currentEthPrice: number;
    }>("/profile/portfolio"),
  history: (limit = 100) =>
    request<{
      records: Array<{
        id: string;
        timestamp: string;
        status: string;
        usdcAmount: number;
        estimatedEth: number;
        ethUsdPrice: number;
        ethAccumulated: number;
        usdcSpent: number;
        txHash?: string;
        dryRun: boolean;
      }>;
    }>(`/profile/history?limit=${limit}`),
};

// Logs APIs
export const logsApi = {
  get: (limit = 100) =>
    request<{ logs: Array<{ timestamp: string; level: string; source: string; message: string }> }>(`/logs?limit=${limit}`),
  clear: () => request<Record<string, unknown>>("/logs", { method: "DELETE" }),
};