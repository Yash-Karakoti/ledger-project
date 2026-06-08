import { useState, useEffect } from "react";
import { dcaApi } from "../api/client";

interface DcaConfig {
  intervalHours: number;
  maxAmountUsdc: number;
  slippageBps: number;
  dryRun: boolean;
  sourceToken: string;
  targetToken: string;
}

interface DcaResult {
  status: string;
  timestamp: string;
  usdcAmount: number;
  estimatedEth: number;
  minEthOut: number;
  ethUsdPrice: number;
  error?: string;
}

export function DcaPanel() {
  const [config, setConfig] = useState<DcaConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<DcaConfig>>({});
  const [result, setResult] = useState<DcaResult | null>(null);
  const [lastExecution, setLastExecution] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await dcaApi.config();
      setConfig(cfg);
      setEditValues(cfg);
    } catch {
      // config endpoint will work once backend is running
    }
  }

  async function loadStatus() {
    try {
      const status = await dcaApi.status();
      setLastExecution(status.lastExecution);
    } catch {
      // no state yet
    }
  }

  async function saveConfig() {
    try {
      await dcaApi.updateConfig(editValues);
      setEditing(false);
      await loadConfig();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save config");
    }
  }

  async function executeDca() {
    setLoading("Executing DCA...");
    try {
      const report = await dcaApi.execute();
      setResult(report as DcaResult);
      setLoading(null);
      await loadStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "DCA execution failed");
      setLoading(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">DCA Strategy</h2>
        <span className={`badge ${config?.dryRun ? "badge-yellow" : "badge-green"}`}>
          {config?.dryRun ? "Dry Run" : "Live"}
        </span>
      </div>

      {/* Config Display / Edit */}
      {config && (
        <div className="space-y-3 mb-4">
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Interval</div>
                  <div className="font-mono">{config.intervalHours}h</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Max Swap</div>
                  <div className="font-mono">${config.maxAmountUsdc} USDC</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Slippage</div>
                  <div className="font-mono">{config.slippageBps / 100}%</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Pair</div>
                  <div className="font-mono">{config.sourceToken} → {config.targetToken}</div>
                </div>
              </div>
              {lastExecution && (
                <div className="text-xs text-gray-500">
                  Last: {new Date(lastExecution).toLocaleString()}
                </div>
              )}
              <button onClick={() => setEditing(true)} className="btn-secondary text-xs w-full">
                Edit Config
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Interval (hours)</label>
                  <input
                    type="number"
                    className="w-full bg-ledger-gray border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                    value={editValues.intervalHours ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, intervalHours: parseInt(e.target.value) || 24 }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max Amount (USDC)</label>
                  <input
                    type="number"
                    className="w-full bg-ledger-gray border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                    value={editValues.maxAmountUsdc ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, maxAmountUsdc: parseInt(e.target.value) || 50 }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Slippage (bps)</label>
                  <input
                    type="number"
                    className="w-full bg-ledger-gray border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                    value={editValues.slippageBps ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, slippageBps: parseInt(e.target.value) || 100 }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mode</label>
                  <select
                    className="w-full bg-ledger-gray border border-gray-600 rounded px-3 py-2 text-sm"
                    value={editValues.dryRun ? "dry" : "live"}
                    onChange={(e) => setEditValues((v) => ({ ...v, dryRun: e.target.value === "dry" }))}
                  >
                    <option value="dry">Dry Run</option>
                    <option value="live">Live</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveConfig} className="btn-primary text-xs flex-1">Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execute */}
      <button
        onClick={executeDca}
        className="btn-primary text-sm w-full"
        disabled={!!loading}
      >
        {loading ? loading : "Execute DCA Cycle"}
      </button>

      {loading && <div className="text-xs text-ledger-accent mt-2 animate-pulse">{loading}</div>}

      {/* Result */}
      {result && (
        <div className={`mt-4 rounded-lg p-3 text-sm ${
          result.status === "error" ? "bg-red-900/30 border border-red-700" : "bg-ledger-mint/10 border border-ledger-mint/30"
        }`}>
          <div className="text-xs text-gray-400 mb-2">
            DCA Result — {new Date(result.timestamp).toLocaleTimeString()}
          </div>
          {result.status === "error" ? (
            <div className="text-red-400 font-mono text-xs">{result.error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div><span className="text-gray-500">Status:</span> {result.status}</div>
              <div><span className="text-gray-500">Amount:</span> ${result.usdcAmount} USDC</div>
              <div><span className="text-gray-500">Est. ETH:</span> {result.estimatedEth.toFixed(6)}</div>
              <div><span className="text-gray-500">Min Out:</span> {result.minEthOut.toFixed(6)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}