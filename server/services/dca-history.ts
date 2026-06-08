/**
 * DCA History Service — Persists and retrieves past DCA execution records
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface DcaHistoryRecord {
  id: string;
  timestamp: string;
  status: "executed" | "dry-run" | "skipped" | "error";
  usdcAmount: number;
  estimatedEth: number;
  minEthOut: number;
  ethUsdPrice: number;
  feeUsd?: number;
  txHash?: string;
  error?: string;
  dryRun: boolean;
  ethAccumulated: number; // cumulative ETH from all previous + this execution
  usdcSpent: number;      // cumulative USDC spent
}

const HISTORY_FILE = resolve(process.cwd(), ".dca-history.json");

function loadHistory(): DcaHistoryRecord[] {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveHistory(records: DcaHistoryRecord[]): void {
  writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2));
}

/**
 * Persist a DCA execution record and return it with cumulative totals.
 */
export function recordExecution(input: {
  timestamp: string;
  status: DcaHistoryRecord["status"];
  usdcAmount: number;
  estimatedEth: number;
  minEthOut: number;
  ethUsdPrice: number;
  txHash?: string;
  error?: string;
  dryRun: boolean;
}): DcaHistoryRecord {
  const history = loadHistory();

  const prevTotalEth = history.length > 0 ? history[history.length - 1].ethAccumulated : 0;
  const prevTotalUsdc = history.length > 0 ? history[history.length - 1].usdcSpent : 0;

  const record: DcaHistoryRecord = {
    id: `dca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...input,
    ethAccumulated: prevTotalEth + (input.status === "executed" || input.status === "dry-run" ? input.estimatedEth : 0),
    usdcSpent: prevTotalUsdc + (input.status === "executed" || input.status === "dry-run" ? input.usdcAmount : 0),
  };

  history.push(record);
  saveHistory(history);
  return record;
}

/**
 * Get all DCA execution history records, newest first.
 */
export function getHistory(): DcaHistoryRecord[] {
  return loadHistory().reverse();
}

/**
 * Get portfolio summary derived from DCA history.
 */
export function getPortfolio(currentEthUsdPrice: number): {
  totalUsdcSpent: number;
  totalEthAccumulated: number;
  currentValueUsd: number;
  avgEntryPrice: number;
  pnlUsd: number;
  pnlPercent: number;
  executionCount: number;
  lastExecution: string | null;
} {
  const history = loadHistory();
  const successful = history.filter(
    (h) => h.status === "executed" || h.status === "dry-run",
  );

  if (successful.length === 0) {
    return {
      totalUsdcSpent: 0,
      totalEthAccumulated: 0,
      currentValueUsd: 0,
      avgEntryPrice: 0,
      pnlUsd: 0,
      pnlPercent: 0,
      executionCount: 0,
      lastExecution: null,
    };
  }

  const last = successful[successful.length - 1];
  const totalUsdcSpent = last.usdcSpent;
  const totalEthAccumulated = last.ethAccumulated;
  const currentValueUsd = totalEthAccumulated * currentEthUsdPrice;
  const avgEntryPrice = totalEthAccumulated > 0 ? totalUsdcSpent / totalEthAccumulated : 0;
  const pnlUsd = currentValueUsd - totalUsdcSpent;
  const pnlPercent = totalUsdcSpent > 0 ? (pnlUsd / totalUsdcSpent) * 100 : 0;

  return {
    totalUsdcSpent,
    totalEthAccumulated,
    currentValueUsd,
    avgEntryPrice,
    pnlUsd,
    pnlPercent,
    executionCount: successful.length,
    lastExecution: last.timestamp,
  };
}