import { useState, useEffect } from "react";
import { DevicePanel } from "./components/DevicePanel";
import { MarketPanel } from "./components/MarketPanel";
import { DcaPanel } from "./components/DcaPanel";
import { LogPanel } from "./components/LogPanel";
import { ProfilePanel } from "./components/ProfilePanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "profile">("dashboard");
  const [serverOnline, setServerOnline] = useState(false);

  useEffect(() => {
    fetch("/api/device/status")
      .then((r) => r.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-ledger-gray px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ledger-accent rounded-lg flex items-center justify-center font-bold text-sm">
              L
            </div>
            <div>
              <h1 className="text-lg font-semibold">Ledger DCA Agent</h1>
              <p className="text-xs text-gray-400">Hardware-Secured Dollar Cost Averaging</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${serverOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-gray-400">{serverOnline ? "Server Online" : "Server Offline"}</span>
            </div>
            <div className="flex gap-1 bg-ledger-gray rounded-lg p-1">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === "dashboard" ? "bg-ledger-accent text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === "logs" ? "bg-ledger-accent text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Terminal
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === "profile" ? "bg-ledger-accent text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === "dashboard" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DevicePanel />
              <DcaPanel />
              <div className="lg:col-span-2">
                <MarketPanel />
              </div>
            </div>
          ) : activeTab === "profile" ? (
            <ProfilePanel />
          ) : (
            <LogPanel />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ledger-gray px-6 py-3 text-center text-xs text-gray-500">
        Built with the Ledger Agent Stack — DMK + Wallet CLI + Speculos
      </footer>
    </div>
  );
}