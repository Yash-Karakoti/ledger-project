/**
 * Unit Tests — Market Module
 */
import { describe, it, expect } from "vitest";
import { calculateEthPurchase, formatMarketSummary, formatSwapOrder } from "../src/market.js";

describe("Market Module", () => {
  describe("calculateEthPurchase", () => {
    it("calculates correct ETH amount for USDC spend", () => {
      const result = calculateEthPurchase(50, 3500, 100);
      expect(result.estimatedEth).toBeCloseTo(0.0142857, 6);
      expect(result.minEthOut).toBeCloseTo(0.0141428, 6);
      expect(result.maxSlippageUsd).toBe(0.5);
    });

    it("handles zero slippage", () => {
      const result = calculateEthPurchase(100, 2000, 0);
      expect(result.estimatedEth).toBe(0.05);
      expect(result.minEthOut).toBe(0.05);
      expect(result.maxSlippageUsd).toBe(0);
    });

    it("handles maximum slippage (100%)", () => {
      const result = calculateEthPurchase(50, 3500, 10000);
      expect(result.estimatedEth).toBeCloseTo(0.0142857, 6);
      expect(result.minEthOut).toBe(0);
      expect(result.maxSlippageUsd).toBe(50);
    });

    it("handles high ETH price", () => {
      const result = calculateEthPurchase(10, 100000, 50);
      expect(result.estimatedEth).toBeCloseTo(0.0001, 6);
      expect(result.minEthOut).toBeCloseTo(0.0000995, 6);
    });
  });

  describe("formatMarketSummary", () => {
    it("formats market data correctly", () => {
      const summary = formatMarketSummary({
        ethUsd: 3500.50,
        usdcUsd: 1.00,
        timestamp: 1700000000000,
      });
      expect(summary).toContain("ETH/USD: $3500.50");
      expect(summary).toContain("USDC/USD: $1.00");
    });
  });

  describe("formatSwapOrder", () => {
    it("formats swap details correctly", () => {
      const order = formatSwapOrder(50, {
        estimatedEth: 0.014285,
        minEthOut: 0.014142,
        maxSlippageUsd: 0.5,
      });
      expect(order).toContain("50.00 USDC");
      expect(order).toContain("0.014285 ETH");
      expect(order).toContain("0.014142 ETH");
      expect(order).toContain("0.50");
    });
  });
});