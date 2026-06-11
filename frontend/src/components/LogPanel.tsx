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
  
  // 1. Target the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 1500); 
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 2. FIXED: Wrapped in a setTimeout to guarantee the DOM has updated the scrollHeight
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth", // Change to "auto" if you want it to snap instantly instead of gliding
        });
      }, 100); // 100ms delay ensures the new log line is painted before calculating height
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

  function isHardwarePause(message: string): boolean {
    const msg = message.toLowerCase();
    return msg.includes("waiting") || msg.includes("verify") || msg.includes("approve") || msg.includes("sign");
  }

  function levelColor(log: LogEntry): string {
    if (isHardwarePause(log.message)) {
      return "text-amber-400 font-bold bg-amber-400/10 px-1 rounded animate-pulse tracking-wide border border-amber-400/20";
    }

    switch (log.level) {
      case "info": return "text-blue-400";
      case "success": return "text-green-400 font-medium";
      case "warn": return "text-yellow-400";
      case "error": return "text-red-500 font-bold bg-red-500/10 px-1 rounded";
      default: return "text-gray-400";
    }
  }

  function formatTime(ts: string): string {
    const date = new Date(ts);
    return date.toISOString().substring(11, 19); 
  }

  return (
    <div className="absolute inset-0 bg-black flex flex-col font-mono text-[13px] leading-relaxed">
      
      {/* Floating Controls inside the Terminal */}
      <div className="absolute top-2 right-4 flex gap-2 z-10 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
            autoScroll 
              ? "bg-indigo-600/20 text-indigo-400 border-indigo-600/30" 
              : "bg-gray-800/50 text-gray-500 border-gray-700 hover:text-white"
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

      {/* 3. The isolated scrollbar container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-10">
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
      </div>
    </div>
  );
}