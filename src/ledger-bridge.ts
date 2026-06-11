/**
 * Ledger Bridge — DMK (Device Management Kit) Wrapper
 *
 * Handles device discovery, session management, genuine check,
 * address derivation, and transaction signing via the Ledger Agent Stack.
 *
 * Supports both physical Ledger devices (Node HID) and the Speculos emulator.
 */

import { createRequire } from "node:module";
import { firstValueFrom, filter, take, timeout } from "rxjs";
import { loadConfig } from "./utils/config.js";

// Ledger npm packages use directory-style re-exports in ESM builds which
// Node.js ESM cannot resolve natively. Load all via CJS require().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _req: any = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _dmk: any = _req("@ledgerhq/device-management-kit");
/* eslint-disable @typescript-eslint/no-explicit-any */
const _speculos: any = _req("@ledgerhq/device-transport-kit-speculos");
const _signerEth: any = _req("@ledgerhq/device-signer-kit-ethereum");
const _nodeHid: any = _req("@ledgerhq/device-transport-kit-node-hid");
/* eslint-enable @typescript-eslint/no-explicit-any */

// DMK exports
const DMKBuilder: new () => { addTransport: (t: unknown) => void; build: () => unknown } = _dmk.DeviceManagementKitBuilder;
const DeviceStatus: Record<string, unknown> = _dmk.DeviceStatus;
const DeviceSessionStateType: Record<string, unknown> = _dmk.DeviceSessionStateType;
const DeviceActionStatus: Record<string, unknown> = _dmk.DeviceActionStatus;
const UserInteractionRequired: Record<string, unknown> = _dmk.UserInteractionRequired;
const GenuineCheckDeviceAction: new (args: { input: { unlockTimeout: number } }) => unknown = _dmk.GenuineCheckDeviceAction;
const GetOsVersionCommand: new () => unknown = _dmk.GetOsVersionCommand;
const isSuccessCommandResult: (result: unknown) => boolean = _dmk.isSuccessCommandResult;

// Transport & signer exports
const speculosTransportFactory: (...args: unknown[]) => unknown = _speculos.speculosTransportFactory;
const speculosIdentifier: string = _speculos.speculosIdentifier || "Speculos"; // Fallback just in case

const nodeHidTransportFactory: unknown = _nodeHid.nodeHidTransportFactory;
const nodeHidIdentifier: string = _nodeHid.nodeHidIdentifier || "NODE-HID";
const SignerEthBuilder: new (args: Record<string, unknown>) => { build: () => Record<string, unknown> } = _signerEth.SignerEthBuilder;

export interface DeviceInfo {
  sessionId: string;
  deviceName: string;
  firmwareVersion?: string;
  isGenuine?: boolean;
}

export interface SignedTransaction {
  r: string;
  s: string;
  v: number;
}

export class LedgerBridge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dmk: any;
  private config = loadConfig();
  private deviceInfo: DeviceInfo | null = null;

  constructor() {
    const builder = new DMKBuilder();

    if (this.config.ledger.useSpeculos) {
      const { apiPort, apduPort } = this.config.ledger.speculos;
      const speculosUrl = `http://127.0.0.1:${apiPort}`;
      builder.addTransport(
        speculosTransportFactory(speculosUrl),
      );
      console.log(`[LedgerBridge] Initialized with Speculos transport (${speculosUrl}, APDU :${apduPort})`);
    } else {
      builder.addTransport(nodeHidTransportFactory);
      console.log("[LedgerBridge] Initialized with Node HID transport (physical Ledger)");
    }

    this.dmk = builder.build();
  }

  /**
   * Discover and connect to a Ledger device (Node/CLI pattern).
   */
    async discoverAndConnect(): Promise<DeviceInfo> {
    // 1. ADD THIS CHECK: Prevent duplicate sessions from React Strict Mode
    if (this.deviceInfo) {
      console.log(`[LedgerBridge] ♻️ Reusing existing session: ${this.deviceInfo.sessionId}`);
      return this.deviceInfo;
    }

    console.log("\n[LedgerBridge] 🔍 Discovering Ledger device...");

    try {
      const devices = await firstValueFrom(
        this.dmk.listenToAvailableDevices({}).pipe(
          filter((list: unknown) => Array.isArray(list) && list.length > 0),
          take(1),
          timeout(10000)
        ),
      ) as Array<{ id: string; name?: string; transport: string }>;

      const device = devices[0];

      console.log(`[LedgerBridge] ✅ Device found: ${device.name ?? "Ledger Device"} (ID: ${device.id})`);

      // 2. KEEP THIS FROM THE PREVIOUS FIX: Disable the background refresher
      const sessionId = await this.dmk.connect({ 
        device,
        sessionRefresherOptions: { isRefresherDisabled: true }
      }) as string;
      
      console.log(`[LedgerBridge] 🔗 Session established: ${sessionId}`);

      this.deviceInfo = {
        sessionId,
        deviceName: device.name ?? "Ledger Device",
      };

      return this.deviceInfo;
    } catch (error) {
      console.error("[LedgerBridge] ❌ Failed to discover/connect:", error);
      throw new Error(
        "Could not connect to Ledger device. " +
        "Ensure Speculos is running in Docker (or device is plugged in).",
      );
    }
  }

  /**
   * Get the device OS version (proof of DMK command usage).
   */
  async getDeviceInfo(): Promise<{ seVersion: string; mcuSephVersion: string }> {
    if (!this.deviceInfo) throw new Error("Not connected.");

    const result = await this.dmk.sendCommand({
      sessionId: this.deviceInfo.sessionId,
      command: new GetOsVersionCommand(),
    });

    if (isSuccessCommandResult(result)) {
      const data = result.data as { seVersion: string; mcuSephVersion: string };
      const info = {
        seVersion: data.seVersion,
        mcuSephVersion: data.mcuSephVersion,
      };
      console.log(`[LedgerBridge] 📋 Firmware: ${info.seVersion}, MCU Seph: ${info.mcuSephVersion}`);
      return info;
    }

    throw new Error("Failed to get device OS version");
  }

  /**
   * Run a genuine check — verifies the device is authentic via Ledger's HSM.
   */
  async verifyGenuine(): Promise<boolean> {
    if (!this.deviceInfo) throw new Error("Not connected.");

    console.log("\n[LedgerBridge] 🛡️ Running genuine check...");

    const { observable } = this.dmk.executeDeviceAction({
      sessionId: this.deviceInfo.sessionId,
      deviceAction: new GenuineCheckDeviceAction({
        input: { unlockTimeout: 60000 },
      }),
    }) as { observable: import("rxjs").Observable<unknown> };

    return new Promise((resolve, reject) => {
      const sub = observable.subscribe({
        next: (s: unknown) => {
          const state = s as Record<string, unknown>;
          if (state.status === DeviceActionStatus.Pending) {
            const interaction = (state.intermediateValue as Record<string, unknown> | undefined)?.requiredUserInteraction;
            if (interaction === UserInteractionRequired.AllowSecureConnection) {
              console.log("[LedgerBridge] ⚠️  Please allow secure connection on your device...");
            }
          }

          if (state.status === DeviceActionStatus.Completed) {
            const isGenuine = (state.output as Record<string, boolean>).isGenuine;
            this.deviceInfo!.isGenuine = isGenuine;
            console.log(
              `[LedgerBridge] ${isGenuine ? "✅ Device is genuine (authentic Ledger)" : "❌ Device verification failed"}`,
            );
            sub.unsubscribe();
            resolve(isGenuine);
          }

          if (state.status === DeviceActionStatus.Error) {
            sub.unsubscribe();
            reject(new Error(`Genuine check failed: ${JSON.stringify(state.error)}`));
          }
        },
        error: (err: unknown) => {
          sub.unsubscribe();
          reject(err);
        },
      });
    });
  }

  /**
   * Get an Ethereum address from the device.
   */
  async getAddress(
    derivationPath?: string,
    verifyOnDevice = true,
  ): Promise<{ address: string; publicKey: string }> {
    if (!this.deviceInfo) throw new Error("Not connected.");

    const path = derivationPath ?? this.config.ledger.derivationPath;
    console.log(`\n[LedgerBridge] 📍 Deriving address at path: ${path}`);

    const signerEth = new SignerEthBuilder({
      dmk: this.dmk,
      sessionId: this.deviceInfo.sessionId,
    }).build();

    const { observable } = (signerEth.getAddress as (path: string, opts: Record<string, unknown>) => { observable: import("rxjs").Observable<unknown> })(
      path,
      { checkOnDevice: verifyOnDevice },
    );

    return new Promise((resolve, reject) => {
      const sub = observable.subscribe({
        next: (s: unknown) => {
          const state = s as Record<string, unknown>;
          if (state.status === DeviceActionStatus.Pending) {
            const interaction = (state.intermediateValue as Record<string, unknown> | undefined)?.requiredUserInteraction;
            if (interaction === UserInteractionRequired.VerifyAddress) {
              console.log("[LedgerBridge] ⚠️  Verify the address on your device screen...");
            }
          }

          if (state.status === DeviceActionStatus.Completed) {
            const output = state.output as { address: string; publicKey: string };
            console.log(`[LedgerBridge] ✅ Address: ${output.address}`);
            sub.unsubscribe();
            resolve(output);
          }

          if (state.status === DeviceActionStatus.Error) {
            sub.unsubscribe();
            reject(new Error(`Address derivation failed: ${JSON.stringify(state.error)}`));
          }
        },
        error: (err: unknown) => {
          sub.unsubscribe();
          reject(err);
        },
      });
    });
  }

  /**
   * Sign an Ethereum transaction.
   */
  async signTransaction(
    txBytes: Uint8Array,
    derivationPath?: string,
  ): Promise<SignedTransaction> {
    if (!this.deviceInfo) throw new Error("Not connected.");

    const path = derivationPath ?? this.config.ledger.derivationPath;
    console.log(`\n[LedgerBridge] ✍️  Requesting signature at path: ${path}`);

    const signerEth = new SignerEthBuilder({
      dmk: this.dmk,
      sessionId: this.deviceInfo.sessionId,
    }).build();

    const { observable } = (signerEth.signTransaction as (path: string, tx: Uint8Array) => { observable: import("rxjs").Observable<unknown> })(
      path,
      txBytes,
    );

    return new Promise((resolve, reject) => {
      const sub = observable.subscribe({
        next: (s: unknown) => {
          const state = s as Record<string, unknown>;
          if (state.status === DeviceActionStatus.Pending) {
            const interaction = (state.intermediateValue as Record<string, unknown> | undefined)?.requiredUserInteraction;
            if (interaction === UserInteractionRequired.SignTransaction) {
              console.log("[LedgerBridge] ⚠️  Review and approve the transaction on your device...");
            }
          }

          if (state.status === DeviceActionStatus.Completed) {
            const output = state.output as SignedTransaction;
            console.log("[LedgerBridge] ✅ Transaction signed on device!");
            sub.unsubscribe();
            resolve(output);
          }

          if (state.status === DeviceActionStatus.Error) {
            sub.unsubscribe();
            reject(new Error(`Signing failed: ${JSON.stringify(state.error)}`));
          }
        },
        error: (err: unknown) => {
          sub.unsubscribe();
          reject(err);
        },
      });
    });
  }

  /**
   * Disconnect from the device and clean up the session.
   */
  async disconnect(): Promise<void> {
    if (this.deviceInfo) {
      await this.dmk.disconnect({ sessionId: this.deviceInfo.sessionId }) as void;
      console.log("[LedgerBridge] 🔌 Disconnected from device.");
      this.deviceInfo = null;
    }
  }

  /**
   * Wait for device to be ready (not locked).
   */
  async waitForDeviceReady(timeoutMs = 30000): Promise<void> {
    if (!this.deviceInfo) throw new Error("Not connected.");

    await firstValueFrom(
      this.dmk.getDeviceSessionState({ sessionId: this.deviceInfo.sessionId }).pipe(
        filter((s: unknown) => {
          const state = s as Record<string, unknown>;
          return state.deviceStatus !== DeviceStatus.LOCKED && state.sessionStateType !== DeviceSessionStateType.Connected;
        }),
        take(1),
        timeout(timeoutMs),
      ),
    );
    console.log("[LedgerBridge] ✅ Device is ready.");
  }
}