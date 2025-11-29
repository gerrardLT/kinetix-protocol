import type { Address } from 'viem';

export enum MarketStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  PAUSED = 'PAUSED'
}

export interface Market {
  id: string;
  contractAddress?: Address; // On-chain contract address
  question: string;
  description: string;
  poolYes: number;
  poolNo: number;
  totalLiquidity: number;
  yieldGenerated: number;
  apy: number;
  endDate: string;
  status: MarketStatus;
  outcome?: boolean; // Set when resolved (true = YES won)
  category: string;
  image: string;
  resolutionSource: string;
}

export interface Bet {
  id: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  timestamp: number;
  claimed: boolean;
  txHash?: string; // Transaction hash for on-chain bets
}

export interface UserState {
  isConnected: boolean;
  address: string | null;
  balance: number; // STT balance (native token)
  bets: Bet[];
  pendingTx?: string; // Current pending transaction
}

export type ViewState = 'MARKET_LIST' | 'MARKET_DETAIL' | 'PORTFOLIO';

// Transaction status for UI feedback
export type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

// On-chain position data
export interface OnChainPosition {
  marketId: `0x${string}`;
  amount: bigint;
  outcome: boolean;
  timestamp: bigint;
  claimed: boolean;
}

// On-chain market data (raw from contract)
export interface OnChainMarket {
  question: string;
  description: string;
  poolYes: bigint;
  poolNo: bigint;
  endTime: bigint;
  status: number; // 0 = Active, 1 = Resolved, 2 = Paused
  outcome: boolean;
  oracle: Address;
}

// SDS real-time update types
export interface SDSMarketUpdate {
  marketId: string;
  poolYes: number;
  poolNo: number;
  totalLiquidity: number;
  timestamp: number;
}

export interface SDSYieldUpdate {
  marketId: string;
  yieldGenerated: number;
  currentAPY: number;
  timestamp: number;
}

export interface SDSBetEvent {
  marketId: string;
  user: string;
  outcome: 'YES' | 'NO';
  amount: number;
  txHash: string;
  timestamp: number;
}

// Re-export Address type for convenience
export type { Address };
