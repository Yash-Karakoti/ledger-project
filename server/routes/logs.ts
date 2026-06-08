/**
 * Logs API Routes — Dashboard log streaming
 */

import { Router, type Request, type Response } from "express";
import { getLogs, clearLogs } from "../services/log-store.js";

const router = Router();

/**
 * GET /api/logs
 * Get recent log entries for the dashboard.
 */
router.get("/", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json({
    success: true,
    logs: getLogs(limit),
  });
});

/**
 * DELETE /api/logs
 * Clear all log entries.
 */
router.delete("/", (_req: Request, res: Response) => {
  clearLogs();
  res.json({ success: true });
});

export default router;