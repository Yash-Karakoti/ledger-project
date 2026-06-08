import { useState, useEffect, useRef } from "react";
import { logsApi } from "../api/client";

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

export function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  async function fetchLogs() {
    try {
      const data = await logsApi.get(200);
      setLogs(data.logs);
    } catch {
      // backend may not be running yet
    }
  }

  function levelColor(level: string): string {
    switch (level) {
      case "info": return "text-blue-300";
      case "success": return "text-green-300";
      case "warn": return "text-yellow-300";
      case "error": return "text-red-400";
      default: return "text-gray-400";
    }
  }

  function timeAgo(ts: string): string {
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (seconds < 5) return "now";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Agent Terminal</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded ${autoScroll ? "bg-ledger-accent text-white" : "bg-ledger-gray text-gray-400"}`}
          >
            Auto-scroll
          </button>
          <button onClick={() => logsApi.clear().then(() => setLogs([]))} className="btn-secondary text-xs">
            Clear
          </button>
        </div>
      </div>

      <div className="log-container bg-black/50 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs leading-relaxed">
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for agent activity...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 hover:bg-white/5 py-0.5 px-1 rounded">
            <span className="text-gray-600 shrink-0 w-12 text-right">{timeAgo(log.timestamp)}</span>
            <span className="text-gray-600 shrink-0 w-16">[{log.source}]</span>
            <span className={levelColor(log.level)}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}