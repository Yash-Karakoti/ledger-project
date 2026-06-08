import { useState, useEffect } from "react";
import { profileApi } from "../api/client";

interface Portfolio {
  totalUsdcSpent: number;
  totalEthAccumulated: number;
  currentValueUsd: number;
  avgEntryPrice: number;
  pnlUsd: number;
  pnlPercent: number;
  executionCount: number;
  lastExecution: string | null;
  currentEthPrice: number;
}

interface HistoryRecord {
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
}

export function ProfilePanel() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const [port, hist] = await Promise.all([
        profileApi.portfolio(),
        profileApi.history(100),
      ]);
      setPortfolio(port);
      setHistory(hist.records);
    } catch {
      // Backend might not be running
    }
    setLoading(false);
  }

  const displayedHistory = showAllHistory ? history : history.slice(0, 10);
  const hasLiveSwaps = history.some((h) => !h.dryRun && h.status === "executed");

  function statusBadge(record: HistoryRecord) {
    if (record.status === "executed") return "badge-green";
    if (record.status === "dry-run") return "badge-yellow";
    if (record.status === "skipped") return "badge-blue";
    return "badge-red";
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Profile & Portfolio
        </h2>
        <button
          onClick={loadProfile}
          className="btn-secondary text-xs"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && !portfolio && (
        <div className="text-center text-gray-500 text-sm py-8">Loading portfolio data...</div>
      )}

      {!loading && !portfolio && (
        <div className="text-center text-gray-500 text-sm py-8">
          No DCA history yet. Execute a DCA cycle to see your portfolio.
        </div>
      )}

      {portfolio && (
        <>
          {/* Portfolio Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-ledger-gray/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Spent</div>
              <div className="text-lg font-bold font-mono text-white">
                ${portfolio.totalUsdcSpent.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-600">USDC</div>
            </div>
            <div className="bg-ledger-gray/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ETH Accumulated</div>
              <div className="text-lg font-bold font-mono text-ledger-mint">
                {portfolio.totalEthAccumulated.toFixed(6)}
              </div>
              <div className="text-[10px] text-gray-600">tokens</div>
            </div>
            <div className="bg-ledger-gray/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current Value</div>
              <div className={`text-lg font-bold font-mono ${portfolio.pnlUsd >= 0 ? "text-green-400" : "text-red-400"}`}>
                ${portfolio.currentValueUsd.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-600">at ${portfolio.currentEthPrice.toFixed(2)}</div>
            </div>
            <div className="bg-ledger-gray/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">P&L</div>
              <div className={`text-lg font-bold font-mono ${portfolio.pnlUsd >= 0 ? "text-green-400" : "text-red-400"}`}>
                {portfolio.pnlUsd >= 0 ? "+" : ""}${portfolio.pnlUsd.toFixed(2)}
              </div>
              <div className={`text-[10px] ${portfolio.pnlPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                {portfolio.pnlPercent >= 0 ? "+" : ""}{portfolio.pnlPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Token Holdings Detail */}
          <div className="bg-ledger-gray/20 border border-ledger-gray rounded-lg p-4 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Token Holdings
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">E</div>
                  <div>
                    <div className="text-sm font-medium">Ethereum</div>
                    <div className="text-[10px] text-gray-500">ETH</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{portfolio.totalEthAccumulated.toFixed(6)} ETH</div>
                  <div className="text-[10px] text-gray-500">${portfolio.currentValueUsd.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">U</div>
                  <div>
                    <div className="text-sm font-medium">USD Coin</div>
                    <div className="text-[10px] text-gray-500">USDC</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">-- USDC</div>
                  <div className="text-[10px] text-gray-500">Spent: ${portfolio.totalUsdcSpent.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-ledger-gray/50">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Average Entry:</span>
                  <span className="float-right font-mono">${portfolio.avgEntryPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Price:</span>
                  <span className="float-right font-mono">${portfolio.currentEthPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">DCA Cycles:</span>
                  <span className="float-right font-mono">{portfolio.executionCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last DCA:</span>
                  <span className="float-right font-mono text-xs">
                    {portfolio.lastExecution
                      ? new Date(portfolio.lastExecution).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DCA History Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                DCA History ({history.length} cycles)
              </h3>
              {history.length > 10 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-xs text-ledger-accent hover:underline"
                >
                  {showAllHistory ? "Show Less" : "Show All"}
                </button>
              )}
            </div>

            {displayedHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-4">No DCA cycles yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-gray-500 border-b border-ledger-gray">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-right py-2 pr-3">Amount</th>
                      <th className="text-right py-2 pr-3">Price</th>
                      <th className="text-right py-2 pr-3">ETH Received</th>
                      <th className="text-right py-2 pr-3">Total ETH</th>
                      <th className="text-center py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistory.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-ledger-gray/40 hover:bg-ledger-gray/20 transition-colors"
                      >
                        <td className="py-2 pr-3 text-gray-400">
                          {new Date(record.timestamp).toLocaleDateString()}{" "}
                          <span className="text-gray-600">
                            {new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">${record.usdcAmount.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-right">
                          ${record.ethUsdPrice > 0 ? record.ethUsdPrice.toFixed(2) : "---"}
                        </td>
                        <td className="py-2 pr-3 text-right text-ledger-mint">
                          {record.estimatedEth > 0 ? record.estimatedEth.toFixed(6) : "---"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {record.ethAccumulated.toFixed(6)}
                        </td>
                        <td className="py-2 text-center">
                          <span className={statusBadge(record)}>{record.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!hasLiveSwaps && portfolio.executionCount > 0 && (
            <div className="mt-4 text-[10px] text-gray-600 text-center">
              All DCA cycles are in dry-run mode. Set <code className="text-ledger-accent">dryRun: false</code> in config for live swaps.
            </div>
          )}
        </>
      )}
    </div>
  );
}