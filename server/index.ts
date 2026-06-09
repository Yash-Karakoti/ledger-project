/**
 * Ledger DCA Agent — Backend Server
 *
 * Express server that wraps the DCA agent logic in REST APIs
 * and serves the frontend dashboard.
 */

import express from "express";
import cors from "cors";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import { initLogCapture } from "./services/log-store.js";
import deviceRoutes from "./routes/device.js";
import marketRoutes from "./routes/market.js";
import dcaRoutes from "./routes/dca.js";
import profileRoutes from "./routes/profile.js";
import logsRoutes from "./routes/logs.js";

// Initialize console log capture for the dashboard
initLogCapture();

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/device", deviceRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/dca", dcaRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/logs", logsRoutes);

// Serve frontend static files in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDist = resolve(__dirname, "..", "frontend", "dist");

if (existsSync(frontendDist)) {
  console.log(`[Server] Serving frontend from ${frontendDist}`);
  app.use(express.static(frontendDist));

  // SPA fallback — use a function-based middleware to avoid path-to-regexp issues
  app.use((_req, res, next) => {
    if (_req.method === "GET" && !_req.path.startsWith("/api")) {
      res.sendFile(resolve(frontendDist, "index.html"));
    } else {
      next();
    }
  });
} else {
  console.log("[Server] Frontend dist not found. Run `cd frontend && npm run build` to build it.");
  console.log("[Server] For development, run frontend separately: `cd frontend && npm run dev`");

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      message: "Ledger DCA Agent API Server",
      docs: "Frontend not built. See frontend/README.md or start frontend dev server.",
    });
  });
}
app.listen(PORT, () => {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Ledger DCA Agent Server`);
  console.log(`  API:     http://localhost:${PORT}/api`);
  console.log(`  Dashboard: http://localhost:${PORT} (when frontend is built)`);
  console.log(`═══════════════════════════════════════\n`);
});