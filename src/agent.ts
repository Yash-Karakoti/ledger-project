/**
 * DCA Agent — Orchestration Layer
 *
 * Coordinates the complete DCA workflow:
 * 1. Initialize Ledger Bridge (DMK connection)
 * 2. Fetch market data
 * 3. Execute DCA strategy
 * 4. Log all steps for competition proof
 *
 * This is the "Intelligence" layer of the architecture.
 * The agent has zero access to private keys — it only
 * orchestrates operations that culminate in hardware-enforced signing.
 */

import { LedgerBridge } from "./ledger-bridge.js";
import { fetchPrices, formatMarketSummary } from "./market.js";
import { executeDca, type DcaExecutionReport } from "./strategies/dca.js";

export interface AgentReport {
  sessionStarted: string;
  deviceConnected: boolean;
  deviceGenuine: boolean | null;
  firmwareVersion: string | null;
  ethAddress: string | null;
  dcaReport: DcaExecutionReport | null;
  completedAt: string;
}

/**
 * Run the complete agent workflow.
 * This is the main entry point for the DCA agent.
 */
export async function runAgent(): Promise<AgentReport> {
  const startTime = new Date();

  console.log("\n");
  console.log("██████████████████████████████████████████████████");
  console.log("  Ledger DCA Agent — Hardware-Secured Automation");
  console.log("██████████████████████████████████████████████████");
  console.log(`  Session: ${startTime.toISOString()}`);
  console.log("  Security Model: Hardware-in-the-Loop (Ledger DMK)");
  console.log("  Strategy: Dollar Cost Averaging (USDC \u2192 ETH)");
  console.log("██████████████████████████████████████████████████\n");

  const report: AgentReport = {
    sessionStarted: startTime.toISOString(),
    deviceConnected: false,
    deviceGenuine: null,
    firmwareVersion: null,
    ethAddress: null,
    dcaReport: null,
    completedAt: "",
  };

  // Phase 1: Initialize Ledger Bridge
  console.log("─── Phase 1: Hardware Initialization ───\n");

  const bridge = new LedgerBridge();

  try {
    const deviceInfo = await bridge.discoverAndConnect();
    report.deviceConnected = true;
    console.log(`\n[Agent] ✅ Connected to: ${deviceInfo.deviceName}`);

    // Get device firmware version (DMK command proof)
    const deviceInfoDetail = await bridge.getDeviceInfo();
    report.firmwareVersion = deviceInfoDetail.seVersion;

    // Run genuine check (DMK device action proof)
    const isGenuine = await bridge.verifyGenuine();
    report.deviceGenuine = isGenuine;

    // Derive ETH address (DMK signer proof)
    const addressInfo = await bridge.getAddress();
    report.ethAddress = addressInfo.address;

    console.log(`\n[Agent] ✅ DMK integration verified — device is ready for signing`);
  } catch (error) {
    console.error(`\n[Agent] ⚠️  Hardware initialization issue: ${error instanceof Error ? error.message : String(error)}`);
    console.log("[Agent] Continuing in headless mode (DCA analysis only)");
  }

  // Phase 2: Market Analysis
  console.log("\n─── Phase 2: Market Analysis ───\n");

  try {
    const prices = await fetchPrices();
    console.log(formatMarketSummary(prices));
    console.log("[Agent] ✅ Market data acquired");
  } catch (error) {
    console.error(`[Agent] ⚠️ Market data unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Phase 3: DCA Execution
  console.log("\n─── Phase 3: DCA Strategy Execution ───\n");

  try {
    const dcaReport = await executeDca();
    report.dcaReport = dcaReport;
    console.log(`\n[Agent] ✅ DCA cycle: ${dcaReport.status}`);
  } catch (error) {
    console.error(`[Agent] ❌ DCA execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Phase 4: Cleanup
  console.log("\n─── Phase 4: Cleanup ───\n");

  try {
    await bridge.disconnect();
    console.log("[Agent] ✅ Session closed");
  } catch {
    console.log("[Agent] No active session to close");
  }

  report.completedAt = new Date().toISOString();

  // Final Summary
  const duration = ((new Date().getTime() - startTime.getTime()) / 1000).toFixed(1);
  console.log("\n═══════════════════════════════════════");
  console.log("  DCA Agent — Session Complete");
  console.log(`  Duration: ${duration}s`);
  console.log(`  Device: ${report.deviceConnected ? "Connected" : "Not connected"}`);
  console.log(`  Genuine: ${report.deviceGenuine === true ? "Verified" : report.deviceGenuine === null ? "N/A" : "Failed"}`);
  console.log(`  Address: ${report.ethAddress ?? "N/A"}`);
  console.log(`  DCA: ${report.dcaReport?.status ?? "N/A"}`);
  console.log("═══════════════════════════════════════\n");

  return report;
}