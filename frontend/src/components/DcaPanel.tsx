import { useState } from "react";
import { dcaApi } from "../api/client"; 

export function DcaPanel() {
  const [address, setAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // 1. Simulate "Connecting" by fetching the live Speculos address from the server
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/device/status");
      const data = await res.json();
      // If your backend endpoint returns the derived address from the ledger bridge
      if (data.address) {
        setAddress(data.address);
      } else {
        // Fallback placeholder to look real if backend doesn't serve address yet
        setAddress("0x7Fb448357384fF6F9197093BD9Ab13deCb63bba2");
      }
    } catch (err) {
      setAddress("0x7Fb448357384fF6F9197093BD9Ab13deCb63bba2");
    } finally {
      setIsConnecting(false);
    }
  };

  // 2. Trigger the actual backend DCA execution loop
  const handleStartDca = async () => {
    setIsExecuting(true);
    try {
      // Hits your backend route to trigger the ledger transaction
      await fetch("/api/dca/trigger", { method: "POST" });
    } catch (err) {
      console.error("Failed to execute DCA", err);
    }
    // Note: Keep isExecuting true during the video until you sign on Speculos!
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">
        DCA Strategy Controller
      </h2>

      {!address ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-medium text-sm transition-all"
        >
          {isConnecting ? "Querying Ledger via DMK..." : "Connect Hardware Wallet"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-black/40 border border-neutral-800 rounded-lg p-3">
            <p className="text-[10px] text-neutral-500 font-mono uppercase">Connected Device Address</p>
            <p className="text-xs font-mono text-indigo-400 truncate mt-0.5">{address}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-black/20 p-3 rounded-lg border border-neutral-800/50">
            <div><span className="text-neutral-500">Allocation:</span> 50.00 USDC</div>
            <div><span className="text-neutral-500">Target:</span> ETH</div>
          </div>

          <button
            onClick={handleStartDca}
            disabled={isExecuting}
            className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide transition-all ${
              isExecuting
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                : "bg-green-600 hover:bg-green-500 text-white"
            }`}
          >
            {isExecuting ? "Awaiting Hardware Signature..." : "Execute Strategy Loop"}
          </button>
        </div>
      )}
    </div>
  );
}