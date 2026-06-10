/**
 * Device API Routes — DMK integration endpoints
 */

import { Router, type Request, type Response } from "express";
import { LedgerBridge } from "../../src/ledger-bridge.js";
import { loadConfig } from "../../src/utils/config.js";

const router = Router();

let bridge: LedgerBridge | null = null;

// FIXED: Exporting this function so dca.ts can use the active connection
export function getBridge(): LedgerBridge {
  if (!bridge) bridge = new LedgerBridge();
  return bridge;
}

/**
 * GET /api/device/status
 * Returns the current device configuration and connection status.
 */
router.get("/status", (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json({
      useSpeculos: config.ledger.useSpeculos,
      speculosPort: config.ledger.speculos.apiPort,
      derivationPath: config.ledger.derivationPath,
      connected: false, // Will be updated after discovery
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to load configuration on the server." 
    });
  }
});

/**
 * POST /api/device/discover
 * Discover and connect to a Ledger device (or Speculos emulator).
 */
router.post("/discover", async (_req: Request, res: Response) => {
  try {
    const b = getBridge();
    const info = await b.discoverAndConnect();
    res.json({
      success: true,
      sessionId: info.sessionId,
      deviceName: info.deviceName,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/device/info
 * Get device firmware and OS version info.
 */
router.get("/info", async (_req: Request, res: Response) => {
  try {
    const b = getBridge();
    const info = await b.getDeviceInfo();
    res.json({
      success: true,
      ...info,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/device/genuine-check
 * Run a genuine check on the connected device.
 */
router.post("/genuine-check", async (_req: Request, res: Response) => {
  try {
    const b = getBridge();
    const isGenuine = await b.verifyGenuine();
    res.json({
      success: true,
      isGenuine,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/device/address
 * Derive the ETH address from the connected device.
 */
router.get("/address", async (req: Request, res: Response) => {
  try {
    const b = getBridge();
    const verifyOnDevice = req.query.verify !== "false";
    const addr = await b.getAddress(undefined, verifyOnDevice);
    res.json({
      success: true,
      address: addr.address,
      publicKey: addr.publicKey,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/device/disconnect
 * Disconnect from the Ledger device.
 */
router.post("/disconnect", async (_req: Request, res: Response) => {
  try {
    if (bridge) {
      await bridge.disconnect();
      bridge = null;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;