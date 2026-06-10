import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  
  // Safely resolve the path regardless of where the script is run from
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = resolve(__dirname, "..", "..", "config", "settings.json");
  
  try {
    const raw = readFileSync(filePath, "utf-8");
    _config = JSON.parse(raw) as AppConfig;
    return _config;
  } catch (error) {
    console.error(`[Config Error] Could not read config at ${filePath}`);
    throw error;
  }
}