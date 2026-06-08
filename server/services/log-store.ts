/**
 * Log Store — In-memory log buffer for the DCA agent dashboard.
 * Provides a stream of structured log entries that the frontend can poll.
 */

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
}

const MAX_LOGS = 500;
const logs: LogEntry[] = [];

// Capture console output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

function parseLogLevel(msg: string): LogEntry["level"] {
  if (msg.includes("❌") || msg.includes("Error") || msg.includes("failed") || msg.includes("error")) return "error";
  if (msg.includes("⚠️") || msg.includes("warn") || msg.includes("skip")) return "warn";
  if (msg.includes("✅") || msg.includes("✔") || msg.includes("Complete") || msg.includes("success")) return "success";
  return "info";
}

function extractSource(msg: string): string {
  const match = msg.match(/^\[([^\]]+)\]/);
  return match ? match[1] : "system";
}

function addEntry(level: LogEntry["level"], source: string, message: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

export function initLogCapture() {
  console.log = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ");
    addEntry(parseLogLevel(msg), extractSource(msg), msg);
    originalConsoleLog(...args);
  };

  console.warn = (...args: unknown[]) => {
    const msg = args.map((a) => String(a)).join(" ");
    addEntry("warn", extractSource(msg), msg);
    originalConsoleWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => String(a)).join(" ");
    addEntry("error", extractSource(msg), msg);
    originalConsoleError(...args);
  };
}

export function getLogs(limit = 100): LogEntry[] {
  return logs.slice(-limit);
}

export function clearLogs() {
  logs.length = 0;
}