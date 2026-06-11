import { useState, useEffect } from "react";
import { DevicePanel } from "./components/DevicePanel";
import { MarketPanel } from "./components/MarketPanel";
import { DcaPanel } from "./components/DcaPanel";
import { LogPanel } from "./components/LogPanel";
import { ProfilePanel } from "./components/ProfilePanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile">("dashboard");
  const [serverOnline, setServerOnline] = useState(false);

  useEffect(() => {
    fetch("/api/device/status")
      .then((r) => r.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#111111] px-6 py-4 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-md flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/20">
              L
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ledger DCA Agent</h1>
              <p className="text-sm text-gray-400 font-mono">Hardware-in-the-Loop Architecture</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
              <span className={`w-2.5 h-2.5 rounded-full ${serverOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
              <span className="text-xs font-mono text-gray-300">{serverOnline ? "System Online" : "System Offline"}</span>
            </div>
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Command Center
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === "profile" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Configuration
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-6 pb-2 overflow-hidden flex flex-col min-h-0">
        <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
          {activeTab === "dashboard" ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1 min-h-0">
              
              {/* Left Column: Execution Controls & Intelligence */}
              {/* Added min-h-0 here to strictly contain the scroll */}
              <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-4 custom-scrollbar h-full min-h-0 relative">
                <DcaPanel />
                <MarketPanel />
                <DevicePanel />
              </div>

              {/* Right Column: Live Terminal Audit */}
              {/* Added min-h-0 here to strictly contain the terminal */}
              <div className="xl:col-span-8 flex flex-col pb-4 h-full min-h-0">
                <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full relative min-h-0">
                  {/* Terminal Header */}
                  <div className="bg-[#111111] border-b border-gray-800 px-4 py-2 flex items-center space-x-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    <span className="text-gray-500 text-xs font-mono ml-4 select-none">agent-execution-log // tail -f</span>
                  </div>
                  {/* Terminal Content wrapper */}
                  <div className="flex-1 overflow-hidden relative min-h-0">
                    <LogPanel />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="max-w-3xl mx-auto mt-10 w-full overflow-y-auto h-full pb-10 custom-scrollbar pr-2">
              <ProfilePanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}