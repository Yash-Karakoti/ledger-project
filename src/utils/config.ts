import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface DcaSettings {
  intervalHours: number;
  maxAmountUsdc: number;
  sourceToken: string;
  targetToken: string;
  chain: string;
  slippageBps: number;
  dryRun: boolean;
}

export interface LedgerSettings {
  useSpeculos: boolean;
  speculos: {
    apiPort: number;
    apduPort: number;
  };
  derivationPath: string;
}

export interface MarketSettings {
  priceApi: string;
  refreshIntervalMs: number;
}

export interface AppConfig {
  dca: DcaSettings;
  ledger: LedgerSettings;
  market: MarketSettings;
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;
  const filePath = resolve(process.cwd(), "config", "settings.json");
  const raw = readFileSync(filePath, "utf-8");
  _config = JSON.parse(raw) as AppConfig;
  return _config;
}