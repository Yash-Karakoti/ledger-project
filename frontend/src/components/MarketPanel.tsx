import { useState, useEffect } from "react";
import { marketApi, dcaApi } from "../api/client";

interface MarketData {
  ethUsd: number;
  usdcUsd: number;
  timestamp: number;
}

interface SwapCalc {
  usdcAmount: number;
  estimatedEth: number;
  minEthOut: number;
  maxSlippageUsd: number;
  ethUsdPrice: number;
  slippageBps: number;
}

export function MarketPanel() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [calc, setCalc] = useState<SwapCalc | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<{ maxAmountUsdc: number; slippageBps: number } | null>(null);

  useEffect(() => {
    dcaApi.config().then(setConfig).catch(() => {});
  }, []);

  async function fetchPrices() {
    setLoading(true);
    try {
      const data = await marketApi.prices();
      setMarket(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function calculateSwap() {
    if (!market || !config) return;
    try {
      const data = await marketApi.calculate(config.maxAmountUsdc, market.ethUsd, config.slippageBps);
      setCalc(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Calculation failed");
    }
  }

  useEffect(() => {
    fetchPrices();
  }, []);

  const timeSince = market
    ? Math.floor((Date.now() - market.timestamp) / 1000)
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Market Data</h2>
        <button onClick={fetchPrices} className="btn-secondary text-xs" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-ledger-gray/30 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">ETH / USD</div>
          <div className="text-2xl font-bold text-white font-mono">
            {market ? `$${market.ethUsd.toFixed(2)}` : "---"}
          </div>
          {timeSince !== null && (
            <div className="text-[10px] text-gray-600 mt-1">{timeSince < 60 ? "Just now" : `${timeSince}s ago`}</div>
          )}
        </div>
        <div className="bg-ledger-gray/30 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">USDC / USD</div>
          <div className="text-2xl font-bold text-white font-mono">
            {market ? `$${market.usdcUsd.toFixed(2)}` : "---"}
          </div>
          <div className="text-[10px] text-gray-600 mt-1">Stablecoin (pegged)</div>
        </div>
        <div className="bg-ledger-gray/30 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">DCA Amount</div>
          <div className="text-2xl font-bold text-ledger-accent font-mono">
            {config ? `${config.maxAmountUsdc} USDC` : "---"}
          </div>
          <div className="text-[10px] text-gray-600 mt-1">Per cycle</div>
        </div>
      </div>

      {market && config && (
        <>
          <button onClick={calculateSwap} className="btn-primary text-xs w-full mb-4">
            Calculate Swap
          </button>

          {calc && (
            <div className="bg-ledger-accent/10 border border-ledger-accent/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-2">Swap Preview</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Spend</div>
                  <div className="font-mono font-medium">{calc.usdcAmount} USDC</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Est. Receive</div>
                  <div className="font-mono font-medium text-ledger-accent">{calc.estimatedEth.toFixed(6)} ETH</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Min Receive ({config.slippageBps / 100}%)</div>
                  <div className="font-mono font-medium">{calc.minEthOut.toFixed(6)} ETH</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}