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
    // Auto-refresh market data every 15 seconds
    const interval = setInterval(() => {
      fetchPrices();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const timeSince = market
    ? Math.floor((Date.now() - market.timestamp) / 1000)
    : null;

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Market Telemetry</h2>
        <button 
          onClick={fetchPrices} 
          disabled={loading}
          className="bg-gray-900 border border-gray-800 text-gray-300 font-medium text-xs py-1.5 px-3 rounded hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Oracle"}
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">ETH / USD</div>
          <div className="text-xl font-bold text-gray-100 font-mono">
            {market ? `$${market.ethUsd.toFixed(2)}` : "---"}
          </div>
          <div className="h-4 mt-1">
            {timeSince !== null && (
              <div className="text-[9px] text-gray-500 font-mono flex items-center justify-center gap-1.5">
                {timeSince < 60 ? "LIVE" : `${timeSince}s ago`}
                {timeSince < 60 && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">USDC / USD</div>
          <div className="text-xl font-bold text-gray-100 font-mono">
            {market ? `$${market.usdcUsd.toFixed(2)}` : "---"}
          </div>
          <div className="h-4 mt-1 text-[9px] text-gray-500 font-mono">Pegged Asset</div>
        </div>
        
        <div className="bg-black/40 border border-gray-800/60 rounded-lg p-4 text-center flex flex-col justify-center relative overflow-hidden">
          {/* Subtle background glow for the active allocation */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/10 blur-xl rounded-full"></div>
          
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 relative z-10">DCA Allocation</div>
          <div className="text-xl font-bold text-indigo-400 font-mono relative z-10">
            {config ? `${config.maxAmountUsdc} USDC` : "---"}
          </div>
          <div className="h-4 mt-1 text-[9px] text-gray-500 font-mono relative z-10">Per Cycle</div>
        </div>
      </div>

      {/* Execution Preview Section */}
      {market && config && (
        <div className="space-y-4">
          <button 
            onClick={calculateSwap} 
            className="w-full bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-300 font-medium text-xs py-2.5 rounded-lg transition-all"
          >
            Generate Execution Preview
          </button>

          {calc && (
            <div className="bg-[#0a0a0a] border border-indigo-500/30 rounded-lg p-4 shadow-inner relative overflow-hidden">
              {/* Subtle accent line on top */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Swap Route Calculated
                </div>
                <div className="text-[9px] text-gray-500 bg-black px-2 py-0.5 rounded border border-gray-800 font-mono">
                  Slippage: {config.slippageBps / 100}%
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm divide-x divide-gray-800/60">
                <div className="pr-2">
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Outflow</div>
                  <div className="font-mono font-medium text-gray-300">{calc.usdcAmount} <span className="text-gray-600 text-[10px]">USDC</span></div>
                </div>
                <div className="px-3">
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Expected Yield</div>
                  <div className="font-mono font-bold text-indigo-400">{calc.estimatedEth.toFixed(6)} <span className="text-indigo-500/50 text-[10px]">ETH</span></div>
                </div>
                <div className="pl-3">
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Minimum Yield</div>
                  <div className="font-mono font-medium text-gray-400">{calc.minEthOut.toFixed(6)} <span className="text-gray-600 text-[10px]">ETH</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}