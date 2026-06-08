#!/usr/bin/env node

/**
 * Ledger DCA Agent — CLI Entry Point
 *
 * Commands:
 *   discover    - Connect to Ledger device, get info, run genuine check
 *   address     - Derive ETH address from device
 *   dca         - Execute one DCA cycle (price check → swap)
 *   daemon      - Run DCA on a continuous schedule
 *   check       - Run the full agent workflow (hardware + market + DCA)
 *   help        - Show this help message
 */

import { runAgent } from "./agent.js";
import { LedgerBridge } from "./ledger-bridge.js";
import { executeDca, startDcaDaemon } from "./strategies/dca.js";

const command = process.argv[2]?.toLowerCase();

function showHelp() {
  console.log(`
Ledger DCA Agent — Autonomous Dollar Cost Averaging with Hardware-Secured Signing

USAGE
  npx tsx src/index.ts <command>

COMMANDS
  discover     Connect to Ledger device, get firmware info, run genuine check
  address      Derive ETH address from the connected Ledger device
  dca          Execute one DCA cycle (validate → fetch prices → calculate swap)
  daemon       Run DCA daemon on continuous schedule
  agent        Run the full agent workflow (hardware + market + DCA)
  help         Show this help message

EXAMPLES
  npx tsx src/index.ts agent        Full competition demo
  npx tsx src/index.ts discover     DMK device connectivity test
  npx tsx src/index.ts address      Get ETH address from Ledger
  npx tsx src/index.ts dca          Run one DCA analysis cycle

REQUIREMENTS
  - Speculos emulator running (default) or physical Ledger device connected via USB
  - Speculos: expose API on port 5000, APDU on port 9999
  - See README.md for Speculos setup instructions

SECURITY MODEL
  The agent orchestrates transactions but has ZERO access to private keys.
  All signing is delegated to the Ledger device via the DMK (Device Management Kit).
  Hardware-in-the-Loop: the device screen is the only trusted display.
`);
}

async function main() {
  switch (command) {
    case "discover": {
      // DMK Proof Command: device discovery + genuine check
      const bridge = new LedgerBridge();
      try {
        const deviceInfo = await bridge.discoverAndConnect();
        console.log(`\nDevice Name: ${deviceInfo.deviceName}`);
        console.log(`Session ID: ${deviceInfo.sessionId}`);

        const info = await bridge.getDeviceInfo();
        console.log(`Firmware: ${info.seVersion}`);
        console.log(`MCU Seph: ${info.mcuSephVersion}`);

        const isGenuine = await bridge.verifyGenuine();
        console.log(`Genuine: ${isGenuine}`);

        await bridge.disconnect();
      } catch (err) {
        console.error("Error:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
      break;
    }

    case "address": {
      // DMK Proof Command: address derivation
      const bridge = new LedgerBridge();
      try {
        await bridge.discoverAndConnect();
        const addr = await bridge.getAddress(process.argv[3], true);
        console.log(`\nEthereum Address: ${addr.address}`);
        console.log(`Public Key: ${addr.publicKey}`);
        await bridge.disconnect();
      } catch (err) {
        console.error("Error:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
      break;
    }

    case "dca": {
      // DCA Strategy: single execution cycle
      const report = await executeDca();
      console.log(`\nResult: ${JSON.stringify(report, null, 2)}`);
      if (report.status === "error") process.exit(1);
      break;
    }

    case "daemon": {
      // DCA Daemon: continuous schedule
      await startDcaDaemon();
      break;
    }

    case "help": {
      showHelp();
      break;
    }

    case "check":
    case "agent":
    case "run":
    default: {
      // Full agent workflow — the competition demo command
      if (command && command !== "check" && command !== "agent" && command !== "run") {
        console.error(`Unknown command: ${command}\n`);
      }
      await runAgent();
      break;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});