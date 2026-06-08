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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Device</h2>
        <span className={`badge ${dev.connected ? "badge-green" : "badge-red"}`}>
          {dev.connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {dev.loading && (
        <div className="text-xs text-ledger-accent mb-3 animate-pulse">{dev.loading}</div>
      )}

      <div className="space-y-3 mb-4">
        {dev.deviceName && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Device</span>
            <span className="font-medium">{dev.deviceName}</span>
          </div>
        )}
        {dev.sessionId && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session</span>
            <span className="font-mono text-xs truncate max-w-[200px]" title={dev.sessionId}>
              {dev.sessionId.slice(0, 24)}...
            </span>
          </div>
        )}
        {dev.firmwareVersion && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Firmware</span>
            <span className="font-mono">{dev.firmwareVersion}</span>
          </div>
        )}
        {dev.isGenuine !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Genuine</span>
            <span className={dev.isGenuine ? "text-green-400" : "text-red-400"}>
              {dev.isGenuine ? "Verified" : "Failed"}
            </span>
          </div>
        )}
        {dev.ethAddress && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">ETH Address</span>
            <span className="font-mono text-xs truncate max-w-[200px]" title={dev.ethAddress}>
              {dev.ethAddress}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!dev.connected ? (
          <button onClick={handleDiscover} className="btn-primary text-xs" disabled={!!dev.loading}>
            Discover & Connect
          </button>
        ) : (
          <>
            <button onClick={handleGenuineCheck} className="btn-secondary text-xs" disabled={!!dev.loading}>
              Genuine Check
            </button>
            <button onClick={handleGetAddress} className="btn-secondary text-xs" disabled={!!dev.loading}>
              Get Address
            </button>
            <button onClick={handleDisconnect} className="btn-secondary text-xs text-red-400 border-red-700 hover:bg-red-900/30" disabled={!!dev.loading}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}