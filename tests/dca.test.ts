/**
 * Unit Tests — DCA Strategy Module
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { loadConfig } from "../src/utils/config.js";

// Mock fetch for market price tests
const originalFetch = globalThis.fetch;

describe("DCA Strategy", () => {
  const stateFile = process.cwd() + "/.dca-state.json";

  beforeEach(() => {
    // Clean up state file before each test
    if (existsSync(stateFile)) {
      unlinkSync(stateFile);
    }
  });

  afterEach(() => {
    if (existsSync(stateFile)) {
      unlinkSync(stateFile);
    }
  });

  describe("Settings Validation", () => {
    it("loads valid config from settings.json", () => {
      const config = loadConfig();
      expect(config.dca).toBeDefined();
      expect(config.dca.maxAmountUsdc).toBeGreaterThan(0);
      expect(config.dca.intervalHours).toBeGreaterThan(0);
      expect(config.dca.sourceToken).toBe("USDC");
      expect(config.dca.targetToken).toBe("ETH");
    });

    it("has valid slippage tolerance", () => {
      const config = loadConfig();
      expect(config.dca.slippageBps).toBeGreaterThanOrEqual(0);
      expect(config.dca.slippageBps).toBeLessThanOrEqual(10000);
    });

    it("has valid Ledger configuration", () => {
      const config = loadConfig();
      expect(config.ledger.useSpeculos).toBeDefined();
      if (config.ledger.useSpeculos) {
        expect(config.ledger.speculos.apiPort).toBeGreaterThan(0);
        expect(config.ledger.speculos.apduPort).toBeGreaterThan(0);
      }
    });
  });
});