/**
 * Market Module — Price Feeds & Balance Checking
 *
 * Fetches current ETH/USD and USDC/USD prices from CoinGecko.
 * Provides balance checks for the DCA agent.
 */

export interface MarketPrices {
  ethUsd: number;
  usdcUsd: number; // Should always be ~1.0
  timestamp: number;
}

export interface PriceCache {
  data: MarketPrices | null;
  lastFetched: number;
}

const cache: PriceCache = {
  data: null,
  lastFetched: 0,
};

/**
 * Fetch current ETH and USDC prices from CoinGecko free API.
 * Caches results to avoid rate limiting.
 */
export async function fetchPrices(
  refreshIntervalMs = 60000,
): Promise<MarketPrices> {
  const now = Date.now();

  if (cache.data && now - cache.lastFetched < refreshIntervalMs) {
    return cache.data;
  }

  console.log("[Market] Fetching current prices from CoinGecko...");

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const data = (await response.json()) as {
      ethereum?: { usd?: number };
      "usd-coin"?: { usd?: number };
    };

    const prices: MarketPrices = {
      ethUsd: data.ethereum?.usd ?? 0,
      usdcUsd: data["usd-coin"]?.usd ?? 1.0,
      timestamp: now,
    };

    cache.data = prices;
    cache.lastFetched = now;

    console.log(`[Market] ETH: $${prices.ethUsd.toFixed(2)}, USDC: $${prices.usdcUsd.toFixed(2)}`);

    return prices;
  } catch (error) {
    if (cache.data) {
      console.warn("[Market] Using cached prices (fetch failed)");
      return cache.data;
    }
    throw error;
  }
}

/**
 * Calculate ETH purchase amount for a given USDC spend.
 * Accounts for slippage tolerance.
 */
export function calculateEthPurchase(
  usdcAmount: number,
  ethUsdPrice: number,
  slippageBps: number,
): { estimatedEth: number; minEthOut: number; maxSlippageUsd: number } {
  const estimatedEth = usdcAmount / ethUsdPrice;
  const slippageFraction = slippageBps / 10000;
  const minEthOut = estimatedEth * (1 - slippageFraction);
  const maxSlippageUsd = usdcAmount * slippageFraction;

  return { estimatedEth, minEthOut, maxSlippageUsd };
}

/**
 * Format market summary for agent logging.
 */
export function formatMarketSummary(prices: MarketPrices): string {
  return [
    "── Market Summary ──",
    `ETH/USD: $${prices.ethUsd.toFixed(2)}`,
    `USDC/USD: $${prices.usdcUsd.toFixed(2)}`,
    `Timestamp: ${new Date(prices.timestamp).toISOString()}`,
    "────────────────────",
  ].join("\n");
}

/**
 * Get a human-readable summary of a swap order.
 */
export function formatSwapOrder(
  usdcAmount: number,
  ethAmount: { estimatedEth: number; minEthOut: number; maxSlippageUsd: number },
): string {
  return [
    "── Swap Order ──",
    `Spend: ${usdcAmount.toFixed(2)} USDC`,
    `Est. Receive: ${ethAmount.estimatedEth.toFixed(6)} ETH`,
    `Min Receive (${ethAmount.maxSlippageUsd.toFixed(2)}% slippage): ${ethAmount.minEthOut.toFixed(6)} ETH`,
    "────────────────",
  ].join("\n");
}