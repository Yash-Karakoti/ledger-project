import { useState } from "react";
import { dcaApi, deviceApi } from "../api/client";

export function DcaPanel() {
  const [address, setAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Strategy Configuration State
  const [allocation, setAllocation] = useState<number>(50);
  const [targetAsset, setTargetAsset] = useState<string>("ETH");
  const [frequency, setFrequency] = useState<number>(1); // Hours

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // FIXED: Actually trigger the device discovery endpoint!
      await deviceApi.discover();
      // If successful, fetch the real derived address from the simulator
      const addrData = await deviceApi.address(false);
      setAddress(addrData.address);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Ledger Simulator. Please ensure 'npm run speculos' is running in a separate terminal.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartDca = async () => {
    setIsExecuting(true);
    try {
      // Update backend config before execution
      await dcaApi.updateConfig({ 
        maxAmountUsdc: allocation, 
        targetToken: targetAsset,
        intervalHours: frequency,
        dryRun: false
      });
      // Trigger execution
      await dcaApi.execute();
    } catch (err) {
      console.error("Execution failed", err);
    }
    setTimeout(() => setIsExecuting(false), 3500); 
  };

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Strategy Configuration
        </h2>
        {address && <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded border border-green-500/20 uppercase tracking-wide">Secured</span>}
      </div>

      {!address ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Hardware authentication required to initialize the automated purchasing loop. Private keys never leave the secure element.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-medium text-sm transition-all text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {isConnecting ? "Establishing Bridge..." : "Authenticate Hardware Wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-black/40 border border-gray-800 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 font-mono uppercase">Authenticated Signer</p>
            <p className="text-xs font-mono text-indigo-400 truncate mt-0.5">{address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Allocation (USDC)</label>
              <input 
                type="number" 
                value={allocation}
                onChange={(e) => setAllocation(Number(e.target.value))}
                className="w-full bg-black/50 border border-gray-800 rounded p-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Target Asset</label>
              <select 
                value={targetAsset}
                onChange={(e) => setTargetAsset(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded p-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStartDca}
            disabled={isExecuting}
            className={`w-full py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all relative overflow-hidden ${
              isExecuting
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/50 cursor-not-allowed"
                : "bg-gray-100 hover:bg-white text-black border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            }`}
          >
            {isExecuting ? (
              <span className="flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                Awaiting Hardware Signature
              </span>
            ) : (
              "Initialize Execution Loop"
            )}
          </button>
        </div>
      )}
    </div>
  );
}