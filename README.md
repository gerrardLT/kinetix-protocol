# Kinetix Protocol

<div align="center">

**The First Yield-Bearing Prediction Layer on Somnia**

*Maximize capital efficiency by earning DeFi yields while predicting outcomes*

[![Somnia Testnet](https://img.shields.io/badge/Network-Somnia%20Testnet-purple)](https://somnia.network)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636)](https://soliditylang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📖 Overview

Kinetix Protocol is a decentralized prediction market built on the **Somnia blockchain**. Unlike traditional prediction markets where capital sits idle until resolution, Kinetix automatically routes betting funds into yield-generating DeFi protocols.

**Key Innovation**: Winners receive their payout **plus** accumulated yield from both sides of the bet.

### Problem

In standard prediction markets, capital used for betting remains idle and unproductive until the market is resolved. This creates an opportunity cost for users.

### Solution

When users place a bet:
1. Funds are locked in the market's vault
2. Vault automatically deposits into yield-generating protocols
3. Yield accrues in real-time for all participants
4. Winners claim: `Original Stake + Winnings + Total Yield`

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Binary Prediction Markets** | YES/NO markets with clear resolution events |
| **Automated Yield Generation** | Funds earn DeFi yields while locked |
| **Real-Time Data (SDS)** | Live updates via Somnia Data Streams |
| **Portfolio Management** | Track positions, yields, and claim winnings |
| **AI Market Analysis** | Gemini-powered market insights |

### Technical Highlights

- **Real-Time Updates**: Live pool sizes, APY, and activity feed without page refresh
- **On-Chain Betting**: All bets recorded on Somnia blockchain
- **Yield Vault Integration**: Automatic yield generation with configurable APY
- **MetaMask Integration**: Seamless wallet connection and transaction signing

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Components        │  Hooks              │  Services            │
│  ├─ LandingPage    │  ├─ useWallet       │  ├─ sdsService       │
│  ├─ MarketCard     │  ├─ usePlaceBet     │  └─ geminiService    │
│  ├─ MarketDetail   │  ├─ useOnChainMarkets                      │
│  ├─ Portfolio      │  ├─ useUserPositions                       │
│  ├─ Navbar         │  ├─ useClaim                               │
│  └─ LiveTicker     │  └─ useVaultContract                       │
├─────────────────────────────────────────────────────────────────┤
│                    Blockchain Layer (wagmi/viem)                │
├─────────────────────────────────────────────────────────────────┤
│                    Somnia Testnet (Chain ID: 50312)             │
├─────────────────────────────────────────────────────────────────┤
│  Smart Contracts                                                │
│  ├─ KinetixMarket.sol  - Betting logic, market resolution       │
│  └─ KinetixVault.sol   - Yield generation, fund management      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| wagmi v2 | Wallet Connection |
| viem | Blockchain Interactions |
| TanStack Query | Data Fetching |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| Recharts | Data Visualization |

### Smart Contracts
| Technology | Purpose |
|------------|---------|
| Solidity 0.8.27 | Contract Language |
| Hardhat | Development Framework |
| OpenZeppelin | Security Libraries |
| TypeChain | Type Generation |

### Blockchain
| Network | Details |
|---------|---------|
| Somnia Testnet | Chain ID: 50312 |
| RPC | https://dream-rpc.somnia.network |
| Explorer | https://somnia-testnet.socialscan.io |
| Native Token | STT (Somnia Test Token) |

---

## 📁 Project Structure

```
kinetix-protocol/
├── App.tsx                    # Main application component
├── index.tsx                  # Entry point
├── types.ts                   # TypeScript type definitions
├── constants.ts               # Initial market data
│
├── components/
│   ├── LandingPage.tsx        # Welcome/intro page
│   ├── Navbar.tsx             # Navigation bar
│   ├── MarketCard.tsx         # Market preview card
│   ├── MarketDetail.tsx       # Full market view
│   ├── Portfolio.tsx          # User positions
│   ├── LiveTicker.tsx         # Real-time activity feed
│   └── ErrorBoundary.tsx      # Error handling
│
├── hooks/
│   ├── useWallet.ts           # Wallet connection
│   ├── usePlaceBet.ts         # Bet placement
│   ├── useOnChainMarkets.ts   # Market data fetching
│   ├── useUserPositions.ts    # User position tracking
│   ├── useClaim.ts            # Winnings claim
│   ├── useVaultContract.ts    # Vault interactions
│   ├── useMarketContract.ts   # Market contract calls
│   └── useSDS.ts              # Somnia Data Streams
│
├── services/
│   ├── sdsService.ts          # Real-time data streaming
│   └── geminiService.ts       # AI market analysis
│
├── config/
│   ├── wagmi.ts               # Wagmi configuration
│   └── chains.ts              # Chain definitions
│
├── contracts/
│   ├── addresses.ts           # Deployed contract addresses
│   ├── MarketABI.ts           # Market contract ABI
│   ├── VaultABI.ts            # Vault contract ABI
│   └── solidity/              # Smart contract source
│       ├── contracts/
│       │   ├── KinetixMarket.sol
│       │   └── KinetixVault.sol
│       ├── scripts/
│       │   └── deploy.ts
│       └── test/
│           └── KinetixMarket.test.ts
│
└── docs/
    └── 需求.md                 # Product requirements (Chinese)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask wallet
- STT tokens (Somnia Testnet)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/kinetix-protocol.git
cd kinetix-protocol
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
API_KEY=your_gemini_api_key  # Optional: for AI analysis
```

4. **Start development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:5173
```

### MetaMask Setup

1. Add Somnia Testnet to MetaMask:
   - Network Name: `Somnia Testnet`
   - RPC URL: `https://dream-rpc.somnia.network`
   - Chain ID: `50312`
   - Currency Symbol: `STT`
   - Explorer: `https://somnia-testnet.socialscan.io`

2. Get testnet STT from the Somnia faucet

---

## 📜 Smart Contracts

### Deployed Addresses (Somnia Testnet)

| Contract | Address |
|----------|---------|
| KinetixMarket | `0xE5B0B67893c9243A814fCA02845a26cE2c2B3156` |
| KinetixVault | `0xE30506c7CFA9d6b7c37946e5a2107DdED67af831` |

### KinetixMarket.sol

Main prediction market contract handling:
- Market creation and management
- Bet placement (YES/NO outcomes)
- Market resolution
- Winnings calculation and payout

**Key Functions:**
```solidity
function placeBet(bytes32 marketId, bool outcome) external payable
function claimWinnings(bytes32 marketId) external returns (uint256 payout)
function resolveMarket(bytes32 marketId, bool outcome) external
```

### KinetixVault.sol

Yield generation vault handling:
- Fund deposits from market contract
- Mock yield generation (MVP)
- Yield distribution to winners

**Key Functions:**
```solidity
function deposit(bytes32 marketId) external payable
function withdraw(bytes32 marketId, address to, uint256 amount) external
function getUserYield(bytes32 marketId, address user) external view returns (uint256)
```

### Contract Development

```bash
cd contracts/solidity

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Somnia Testnet
npx hardhat run scripts/deploy.ts --network somnia
```

---

## 🔄 User Flow

```
1. Connect Wallet
   └─> MetaMask connects to Somnia Testnet

2. Browse Markets
   └─> View active prediction markets with live odds

3. Select Market
   └─> See detailed info, current odds, total liquidity

4. Place Bet
   └─> Choose YES/NO, enter amount, confirm transaction
   └─> Funds automatically routed to yield vault

5. Track Position
   └─> Portfolio shows active bets, accumulated yield

6. Claim Winnings
   └─> After resolution, winners claim stake + winnings + yield
```

---

## 🔌 Somnia Data Streams (SDS)

Kinetix leverages Somnia Data Streams for real-time blockchain updates:

```typescript
// Subscribe to market updates
sdsService.subscribeToMarket('m1', (update) => {
  console.log('Pool updated:', update.poolYes, update.poolNo);
});

// Subscribe to bet events
sdsService.subscribeToBets((event) => {
  console.log('New bet:', event.user, event.outcome, event.amount);
});

// Subscribe to yield updates
sdsService.subscribeToYield('m1', (update) => {
  console.log('Yield:', update.yieldGenerated, 'APY:', update.currentAPY);
});
```

---

## 🧪 Testing

### Frontend
```bash
npm run build  # Type check and build
```

### Smart Contracts
```bash
cd contracts/solidity
npx hardhat test
```

---

## 📊 Market Data

### Pre-configured Markets

| ID | Question | Category |
|----|----------|----------|
| m1 | Will Bitcoin break $100k by Q4 2025? | Crypto |
| m2 | Will Somnia Mainnet launch before June 2025? | Ecosystem |
| m3 | Will the Fed cut interest rates in the next FOMC meeting? | Macro |

### Market IDs (bytes32)
```typescript
m1: '0x83267a439473d40c510063b30f7c06d1e3bf496ea5e34c5e3290dfc7dc527ce1'
m2: '0x4c7b5cd57855cee824dfb36438b88ecb25d2d1493a0c53b69912ec4957d84d68'
m3: '0x7ad03d14656a059c9413d59d5609716f0def9014d30d8d88904e8f9eed6b99d8'
```

---

## 🔒 Security

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Admin access control
- **Input Validation**: All user inputs validated on-chain

---

## 🗺️ Roadmap

### MVP (Current)
- [x] Binary prediction markets
- [x] Mock yield generation
- [x] Real-time data streaming (simulated)
- [x] Portfolio management
- [x] Wallet integration

### Future
- [ ] Real DeFi protocol integration
- [ ] Multiple collateral types
- [ ] User-created markets
- [ ] Governance token
- [ ] Mobile application

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [Somnia Network](https://somnia.network)
- [Somnia Testnet Explorer](https://somnia-testnet.socialscan.io)
- [wagmi Documentation](https://wagmi.sh)
- [viem Documentation](https://viem.sh)

---

<div align="center">

**Built for the Somnia Hackathon** 🚀

</div>
