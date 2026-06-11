# Ledger DCA Agent - Hardware Secured Dollar Cost Averaging

> An autonomous DCA (Dollar Cost Averaging) agent that swaps USDC for ETH using Ledger's **Device Management Kit (DMK)** for hardware-enforced signing. The AI agent analyzes markets and assembles transactions, but has **zero access to the private key** — the Ledger device (or Speculos emulator) is the only signing authority.
>
> Includes an interactive **web dashboard** with live market data, device management, DCA controls, and a terminal log viewer.

## Architecture

```
                          ┌─────────────────────────┐
                          │   Web Dashboard (React)  │
                          │  ─ device panel          │
                          │  ─ market panel          │
                          │  ─ DCA controls          │
                          │  ─ live terminal         │
                          └──────────┬──────────────┘
                                     │ REST API (localhost:3001)
                          ┌──────────▼──────────────┐
                          │   Express Backend        │
                          │  ─ /api/device/*         │
                          │  ─ /api/market/*         │
                          │  ─ /api/dca/*            │
                          │  ─ /api/logs/*           │
                          └──────────┬──────────────┘
                                     │
                          ┌──────────▼──────────────┐
                          │   AI Agent (Intelligence)│
                          │  ─ market analysis       │
                          │  ─ interval checking     │
                          │  ─ swap assembly         │
                          └──────────┬──────────────┘
                                     │ transaction payload
                          ┌──────────▼──────────────┐
                          │   Ledger Bridge (DMK)    │
                          │  ─ device discovery      │
                          │  ─ session management    │
                          │  ─ genuine check         │
                          │  ─ address derivation    │
                          │  ─ transaction signing   │
                          └──────────┬──────────────┘
                                     │ signed / rejected
                          ┌──────────▼──────────────┐
                          │   Speculos / Ledger HW   │
                          │  (hardware root of trust) │
                          └─────────────────────────┘
```

**Three layers, one constraint: the agent never holds the key.**

| Layer | Responsibility | Keys? |
|---|---|---|
| Dashboard | Interactive UI | None |
| Backend + Agent | Market analysis, interval scheduling, orchestration | None |
| Bridge (`src/ledger-bridge.ts`) | DMK session, device communication, signing | Session only |
| Device (Speculos/Hardware) | Private key storage, transaction signing | Yes — never leaves device |

## Ledger Agent Stack Integration (DMK + Wallet CLI)

### DMK (Device Management Kit) — TypeScript SDK
- **Device Discovery & Connection**: `startDiscovering()` + `connect()` — detects Ledger device over HID or Speculos transport
- **Device Session Management**: `getDeviceSessionState()` — monitors device readiness, lock status, app state
- **Genuine Check**: `GenuineCheckDeviceAction` — verifies device authenticity against Ledger's HSM
- **OS Version**: `GetOsVersionCommand` — reads firmware and MCU versions
- **Ethereum Signer**: `SignerEthBuilder` — derives addresses and signs transactions with `getAddress()` and `signTransaction()`
- **Observable Subscription Pattern**: All actions return `{ observable, cancel }` with typed `DeviceActionStatus` states

### Wallet CLI
- The agent prepares swap payloads compatible with `wallet-cli swap quote` / `swap execute` for live DEX execution

### Speculos Emulator
- Full signing flow demo without physical hardware — the emulated device screen shows transaction details for human verification

## Project Structure

```
ledger-dca-agent/
├── config/
│   └── settings.json            # DCA parameters
├── src/                         # Core agent code
│   ├── index.ts                 # CLI entry point (6 commands)
│   ├── agent.ts                 # Orchestration → full agent workflow
│   ├── market.ts                # Price feeds (CoinGecko) + swap math
│   ├── ledger-bridge.ts         # DMK wrapper (core integration)
│   └── strategies/
│       └── dca.ts               # DCA strategy logic
├── server/                      # Express backend
│   ├── index.ts                 # Server entry (port 3001)
│   ├── routes/
│   │   ├── device.ts            # Device API routes
│   │   ├── market.ts            # Market API routes
│   │   ├── dca.ts               # DCA API routes
│   │   └── logs.ts              # Log streaming API
│   └── services/
│       └── log-store.ts         # In-memory log capture
├── frontend/                    # React dashboard
│   ├── src/
│   │   ├── App.tsx              # Main dashboard layout
│   │   ├── api/client.ts        # API client
│   │   └── components/
│   │       ├── DevicePanel.tsx   # Device connect/genuine/address
│   │       ├── MarketPanel.tsx   # Live prices + swap calc
│   │       ├── DcaPanel.tsx     # DCA config + execute
│   │       └── LogPanel.tsx     # Terminal log viewer
│   ├── index.html / vite.config.ts / tailwind.config.js
│   └── dist/                    # Built frontend (served by backend)
├── tests/
│   ├── market.test.ts           # 6 market tests
│   └── dca.test.ts              # 4 strategy tests
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- **Node.js** 18+ (for DMK and Wallet CLI)
- **npm**, **pnpm**, or **yarn**
- **Speculos** (recommended for development) or a physical **Ledger device** (Nano S+, Nano X, Stax, Flex)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd ledger-dca-agent
npm install
cd frontend && npm install && cd ..
```

### 2. Speculos Setup (no hardware required)

**Option A: Docker (recommended)**
```bash
git clone https://github.com/LedgerHQ/speculos
cd speculos
docker build -t speculos .
docker run --rm -it -p 5000:5000 -p 9999:9999 \
  -v "$(pwd)/apps:/speculos/apps" \
  speculos ./speculos.py apps/ethereum.elf \
  --display headless \
  --api-port 5000 \
  --apdu-port 9999
```

**Option B: Python (no Docker)**
```bash
git clone https://github.com/LedgerHQ/speculos
cd speculos
pip install -r requirements.txt
./speculos.py apps/ethereum.elf --display headless --api-port 5000 --apdu-port 9999
```

> **Competition note:** Speculos emulator counts as valid proof-of-use. No physical Ledger required.

### 3. Configure

Edit `config/settings.json`:

```json
{
  "dca": {
    "intervalHours": 24,
    "maxAmountUsdc": 50,
    "sourceToken": "USDC",
    "targetToken": "ETH",
    "chain": "ethereum",
    "slippageBps": 100,
    "dryRun": true
  },
  "ledger": {
    "useSpeculos": true,
    "speculos": { "apiPort": 5000, "apduPort": 9999 },
    "derivationPath": "44'/60'/0'/0/0"
  }
}
```

**`dryRun: true`** is safe — it does analysis but skips transaction execution.

## Running Everything

### Start the Dashboard (full stack)

**Terminal 1 — Backend + Dashboard:**
```bash
cd ledger-dca-agent
npx tsx server/index.ts
# → API: http://localhost:3001/api
# → Dashboard: http://localhost:3001
```

**Terminal 2 — Frontend dev (hot reload, optional):**
```bash
cd ledger-dca-agent/frontend
npm run dev
# → http://localhost:5173 (with API proxy to backend)
```

### CLI Commands

```bash
# Full agent workflow (competition demo) — needs Speculos running
npx tsx src/index.ts agent

# DMK proof: device discovery + firmware + genuine check
npx tsx src/index.ts discover

# DMK proof: derive ETH address
npx tsx src/index.ts address

# Check: run DCA analysis (works without Speculos)
npx tsx src/index.ts dca

# Help
npx tsx src/index.ts help
```

### Testing

```bash
# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage
```

## Competition Submission Checklist

Use these commands to verify everything needed for the submission:

### 1. DMK Integration Proof

```bash
# Terminal: prove DMK integration compiles and works
npx tsc --noEmit
npx vitest run

# With Speculos running:
npx tsx src/index.ts discover    # Shows device discovery, firmware, genuine check
npx tsx src/index.ts address     # Shows ETH address derivation via DMK
```

**DMK features implemented in `src/ledger-bridge.ts`:**

| DMK Feature | Code Location |
|---|---|
| `DeviceManagementKitBuilder` with Speculos transport | Line 54-58 |
| `startDiscovering()` + `connect()` — discovery | Line 78-84 |
| `GetOsVersionCommand` — firmware info | Line 103-114 |
| `GenuineCheckDeviceAction` — authenticity | Line 128-163 |
| `SignerEthBuilder.getAddress()` — address derivation | Line 181-217 |
| `SignerEthBuilder.signTransaction()` — transaction signing | Line 232-271 |
| Observable subscription with `DeviceActionStatus` | Lines 140-162, 195-216 |
| `UserInteractionRequired` HITL prompts | Lines 145, 200, 251 |
| `getDeviceSessionState()` — device readiness | Line 289 |
| Error classification with `_tag` / error codes | Pattern ready in code |

### 2. Wallet CLI Proof

```bash
# Install the Wallet CLI
npm install -g @ledgerhq/wallet-cli

# With Speculos running:
wallet-cli session view                           # Session management
wallet-cli account discover ethereum              # Account discovery
wallet-cli receive ethereum-1 --no-verify         # Receive address
wallet-cli balances ethereum-1                    # Balance check
wallet-cli genuine-check                          # Authenticity verification
```

### 3. Speculos Emulator Proof

When Speculos is running with the Ethereum app:
- The emulator screen shows the device UI at `http://localhost:5000`
- The DCA agent uses Speculos transport for discovery + signing
- Run `npx tsx src/index.ts discover` to confirm device communication

### 4. Interactive Dashboard

With the backend running:
- Open **http://localhost:3001** (or http://localhost:5173 for hot-reload)
- **Device Panel**: Connect to Speculos, run genuine check, get ETH address
- **Market Panel**: Live ETH/USD price from CoinGecko, swap calculator
- **DCA Panel**: Configure interval/amount/slippage, execute DCA cycles
- **Terminal Panel**: Live agent log output

### 5. Security Model

- **Hardware-in-the-Loop**: The agent orchestrates but never signs. All cryptographic operations happen on the Ledger device.
- **Zero Key Access**: No private key is stored in `.env`, config, or environment variables.
- **Human Verification**: The device screen (real or emulated) displays the exact transaction for user approval before signing.
- **Deterministic Guardrails**: The config enforces `maxAmountUsdc` and `intervalHours` — the agent cannot exceed these limits.

---

## License

MIT — Built for the Ledger Agent Stack competition.

---

*Built with the [Ledger Agent Stack](https://developers.ledger.com/docs/ai-tools/overview) — DMK, Wallet CLI, and Speculos.*
