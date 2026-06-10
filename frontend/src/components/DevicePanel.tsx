import { useState } from "react";
import { deviceApi } from "../api/client";

interface DeviceState {
  connected: boolean;
  sessionId: string | null;
  deviceName: string | null;
  firmwareVersion: string | null;
  isGenuine: boolean | null;
  ethAddress: string | null;
  loading: string | null;
}

export function DevicePanel() {
  const [dev, setDev] = useState<DeviceState>({
    connected: false,
    sessionId: null,
    deviceName: null,
    firmwareVersion: null,
    isGenuine: null,
    ethAddress: null,
    loading: null,
  });

  async function handleDiscover() {
    setDev((d) => ({ ...d, loading: "Connecting..." }));
    try {
      const result = await deviceApi.discover();
      setDev((d) => ({
        ...d,
        connected: true,
        sessionId: result.sessionId,
        deviceName: result.deviceName,
        loading: null,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Connection failed");
      setDev((d) => ({ ...d, loading: null }));
    }
  }

  async function handleGenuineCheck() {
    setDev((d) => ({ ...d, loading: "Running genuine check..." }));
    try {
      const info = await deviceApi.info();
      const genuine = await deviceApi.genuineCheck();
      setDev((d) => ({
        ...d,
        firmwareVersion: info.seVersion,
        isGenuine: genuine.isGenuine,
        loading: null,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Genuine check failed");
      setDev((d) => ({ ...d, loading: null }));
    }
  }

  async function handleGetAddress() {
    setDev((d) => ({ ...d, loading: "Deriving address..." }));
    try {
      const addr = await deviceApi.address(false);
      setDev((d) => ({
        ...d,
        ethAddress: addr.address,
        loading: null,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Address derivation failed");
      setDev((d) => ({ ...d, loading: null }));
    }
  }

  async function handleDisconnect() {
    setDev((d) => ({ ...d, loading: "Disconnecting..." }));
    try {
      await deviceApi.disconnect();
      setDev({
        connected: false,
        sessionId: null,
        deviceName: null,
        firmwareVersion: null,
        isGenuine: null,
        ethAddress: null,
        loading: null,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Disconnect failed");
      setDev((d) => ({ ...d, loading: null }));
    }
  }

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 shadow-lg">
      {/* Header Status line */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Hardware Diagnostics
        </h2>
        <span className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wide transition-all ${
          dev.connected 
            ? "bg-green-500/10 text-green-400 border-green-500/20" 
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {dev.connected ? "Active Session" : "Disconnected"}
        </span>
      </div>

      {/* Loading Status Updates */}
      {dev.loading && (
        <div className="text-xs text-amber-400 mb-4 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded font-mono animate-pulse">
          ⚡ {dev.loading}
        </div>
      )}

      {/* Hardware Telemetry Parameters */}
      <div className="space-y-3 mb-5">
        {dev.deviceName && (
          <div className="flex justify-between items-center bg-black/30 border border-gray-800/60 p-2.5 rounded-lg">
            <span className="text-xs text-gray-500 font-mono uppercase">Target Device</span>
            <span className="text-sm font-medium text-gray-200">{dev.deviceName}</span>
          </div>
        )}
        
        {dev.sessionId && (
          <div className="flex justify-between items-center bg-black/30 border border-gray-800/60 p-2.5 rounded-lg">
            <span className="text-xs text-gray-500 font-mono uppercase">Session Token</span>
            <span className="font-mono text-xs text-indigo-400 truncate max-w-[180px]" title={dev.sessionId}>
              {dev.sessionId.slice(0, 16)}...
            </span>
          </div>
        )}

        {dev.firmwareVersion && (
          <div className="flex justify-between items-center bg-black/30 border border-gray-800/60 p-2.5 rounded-lg">
            <span className="text-xs text-gray-500 font-mono uppercase">Secure Element</span>
            <span className="font-mono text-xs text-gray-300">v{dev.firmwareVersion}</span>
          </div>
        )}

        {dev.isGenuine !== null && (
          <div className="flex justify-between items-center bg-black/30 border border-gray-800/60 p-2.5 rounded-lg">
            <span className="text-xs text-gray-500 font-mono uppercase">Root of Trust</span>
            <span className={`text-xs font-bold font-mono ${dev.isGenuine ? "text-green-400" : "text-red-400"}`}>
              {dev.isGenuine ? "✓ Cryptographically Verified" : "✗ Verification Failed"}
            </span>
          </div>
        )}

        {dev.ethAddress && (
          <div className="flex flex-col bg-black/40 border border-gray-800 p-3 rounded-lg">
            <span className="text-[10px] text-gray-500 font-mono uppercase mb-1">Derived Public Identifier</span>
            <span className="font-mono text-xs text-indigo-400 break-all select-all" title={dev.ethAddress}>
              {dev.ethAddress}
            </span>
          </div>
        )}
      </div>

      {/* Command Control Actions */}
      <div className="flex flex-wrap gap-2">
        {!dev.connected ? (
          <button 
            onClick={handleDiscover} 
            disabled={!!dev.loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] disabled:opacity-50"
          >
            Discover Stack Bridge
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full">
            <button 
              onClick={handleGenuineCheck} 
              disabled={!!dev.loading}
              className="bg-gray-900 border border-gray-800 text-gray-300 font-medium text-xs py-2 rounded hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
            >
              Attest Device
            </button>
            <button 
              onClick={handleGetAddress} 
              disabled={!!dev.loading}
              className="bg-gray-900 border border-gray-800 text-gray-300 font-medium text-xs py-2 rounded hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
            >
              Derive Address
            </button>
            <button 
              onClick={handleDisconnect} 
              disabled={!!dev.loading}
              className="col-span-2 mt-1 bg-red-950/20 border border-red-900/50 text-red-400 font-medium text-xs py-2 rounded hover:bg-red-900/40 hover:text-red-300 transition-all disabled:opacity-50"
            >
              Terminate Session Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}