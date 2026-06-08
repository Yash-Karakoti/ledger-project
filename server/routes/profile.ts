/**
 * Profile API Routes — Portfolio summary, token tracking, DCA performance
 */

import { Router, type Request, type Response } from "express";
import { getPortfolio, getHistory } from "../services/dca-history.js";
import { fetchPrices } from "../../src/market.js";
import { loadConfig } from "../../src/utils/config.js";

const router = Router();

/**
 * GET /api/profile/portfolio
 * Get the user's portfolio summary:
 *   - Total USDC spent
 *   - Total ETH accumulated
 *   - Current portfolio value in USD
 *   - Average entry price
 *   - P&L
 *   - Execution count
 */
router.get("/portfolio", async (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const prices = await fetchPrices(config.market.refreshIntervalMs);
    const portfolio = getPortfolio(prices.ethUsd);

    res.json({
      success: true,
      ...portfolio,
      currentEthPrice: prices.ethUsd,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/profile/history
 * Get all DCA execution records for the profile view.
 */
router.get("/history", (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 100;
    const records = getHistory().slice(0, limit);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;