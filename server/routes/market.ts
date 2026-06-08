/**
 * Market API Routes — Price feed and swap calculation endpoints
 */

import { Router, type Request, type Response } from "express";
import { fetchPrices, calculateEthPurchase, formatMarketSummary } from "../../src/market.js";
import { loadConfig } from "../../src/utils/config.js";

const router = Router();

/**
 * GET /api/market/prices
 * Get current ETH/USD and USDC/USD prices.
 */
router.get("/prices", async (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const prices = await fetchPrices(config.market.refreshIntervalMs);
    res.json({
      success: true,
      ethUsd: prices.ethUsd,
      usdcUsd: prices.usdcUsd,
      timestamp: prices.timestamp,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/market/calculate
 * Calculate ETH purchase for a given USDC amount.
 * Query params: amount (USDC amount), slippageBps (optional, defaults to config)
 */
router.get("/calculate", (req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const usdcAmount = parseFloat(req.query.amount as string) || config.dca.maxAmountUsdc;
    const slippageBps = parseInt(req.query.slippageBps as string) || config.dca.slippageBps;
    const ethUsdPrice = parseFloat(req.query.ethPrice as string) || 0;

    if (!ethUsdPrice) {
      res.status(400).json({
        success: false,
        error: "ETH price required. Fetch prices first.",
      });
      return;
    }

    const result = calculateEthPurchase(usdcAmount, ethUsdPrice, slippageBps);
    res.json({
      success: true,
      usdcAmount,
      ethUsdPrice,
      slippageBps,
      estimatedEth: result.estimatedEth,
      minEthOut: result.minEthOut,
      maxSlippageUsd: result.maxSlippageUsd,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;