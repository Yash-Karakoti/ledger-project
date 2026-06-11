/**
 * DCA API Routes — DCA strategy execution and configuration endpoints
 */

import { Router, type Request, type Response } from "express";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { executeDca } from "../../src/strategies/dca.js";
import { loadConfig } from "../../src/utils/config.js";
import { recordExecution, getHistory } from "../services/dca-history.js";
// FIXED: Import getBridge to access the active Ledger session
import { getBridge } from "./device.js";

const router = Router();

// Safely resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * GET /api/dca/config
 * Get the current DCA configuration.
 */
router.get("/config", (_req: Request, res: Response) => {
  const config = loadConfig();
  res.json({
    success: true,
    ...config.dca,
  });
});

/**
 * PUT /api/dca/config
 * Update DCA configuration settings.
 */
router.put("/config", (req: Request, res: Response) => {
  try {
    // FIXED: Use absolute pathing to prevent 500 errors
    const configPath = resolve(__dirname, "..", "..", "config", "settings.json");
    const current = JSON.parse(readFileSync(configPath, "utf-8"));

    const updates = req.body;
    if (updates.intervalHours !== undefined) current.dca.intervalHours = updates.intervalHours;
    if (updates.maxAmountUsdc !== undefined) current.dca.maxAmountUsdc = updates.maxAmountUsdc;
    if (updates.slippageBps !== undefined) current.dca.slippageBps = updates.slippageBps;
    if (updates.dryRun !== undefined) current.dca.dryRun = updates.dryRun;

    writeFileSync(configPath, JSON.stringify(current, null, 2));
    res.json({ success: true, ...current.dca });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/dca/execute
 * Execute a single DCA cycle and persist the result to history.
 */
router.post("/execute", async (_req: Request, res: Response) => {
  try {
    const bridge = getBridge();
    
    await bridge.discoverAndConnect();

    const report = await executeDca(bridge, true);

    const persisted = recordExecution({
      timestamp: report.timestamp,
      status: report.status,
      usdcAmount: report.usdcAmount,
      estimatedEth: report.estimatedEth,
      minEthOut: report.minEthOut,
      ethUsdPrice: report.ethUsdPrice,
      txHash: report.txHash,
      error: report.error,
      dryRun: report.dryRun,
    });

    res.json({
      success: true,
      ...report,
      id: persisted.id,
      ethAccumulated: persisted.ethAccumulated,
      usdcSpent: persisted.usdcSpent,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/dca/history
 * Get past DCA execution history.
 */
router.get("/history", (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 50;
    const records = getHistory().slice(0, limit);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/dca/status
 * Get the last DCA execution state.
 */
router.get("/status", (_req: Request, res: Response) => {
  try {
    // FIXED: Use absolute pathing here as well
    const stateFile = resolve(__dirname, "..", "..", ".dca-state.json");
    const state = JSON.parse(readFileSync(stateFile, "utf-8"));
    res.json({ success: true, ...state });
  } catch {
    res.json({ success: true, lastExecution: null });
  }
});

export default router;