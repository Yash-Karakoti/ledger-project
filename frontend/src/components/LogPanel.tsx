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

  // Poll backend for live logs
  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 1500); // Slightly faster polling for the video demo
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
      // Backend may not be running yet
    }
  }

  // Demo Magic: Highlight the hardware gatekeeping steps
  function isHardwarePause(message: string): boolean {
    const msg = message.toLowerCase();
    return msg.includes("waiting") || msg.includes("verify") || msg.includes("approve");
  }

  function levelColor(log: LogEntry): string {
    // Override colors if the system is waiting for the Ledger device
    if (isHardwarePause(log.message)) {
      return "text-amber-400 font-bold animate-pulse tracking-wide";
    }

    switch (log.level) {
      case "info": return "text-blue-400";
      case "success": return "text-green-400";
      case "warn": return "text-yellow-400";
      case "error": return "text-red-500 font-bold";
      default: return "text-gray-400";
    }
  }

  function formatTime(ts: string): string {
    const date = new Date(ts);
    return date.toISOString().substring(11, 19); // Returns HH:MM:SS format
  }

  return (
    <div className="relative h-full w-full bg-black flex flex-col font-mono text-[13px] leading-relaxed">
      
      {/* Floating Controls inside the Terminal */}
      <div className="absolute top-2 right-4 flex gap-2 z-10 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
            autoScroll 
              ? "bg-indigo-600/20 text-indigo-400 border-indigo-600/30" 
              : "bg-gray-800/50 text-gray-500 border-gray-700"
          }`}
        >
          Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </button>
        <button 
          onClick={() => logsApi.clear().then(() => setLogs([]))} 
          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border bg-gray-800/50 text-gray-500 border-gray-700 hover:text-white"
        >
          Clear
        </button>
      </div>

      {/* Terminal Log Output */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-gray-600 italic animate-pulse">Waiting for execution triggers...</div>
        )}
        
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 hover:bg-white/[0.02] py-1 px-2 rounded break-words">
            <span className="text-gray-600 shrink-0 select-none">
              [{formatTime(log.timestamp)}]
            </span>
            <span className="text-gray-500 shrink-0 w-24 select-none truncate">
              {log.source}
            </span>
            <span className={`flex-1 ${levelColor(log)}`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}