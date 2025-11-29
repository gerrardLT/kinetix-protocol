import { useReadContract, useReadContracts } from 'wagmi';
import { MarketABI } from '../contracts/MarketABI';
import { CONTRACT_ADDRESSES, getMarketIdBytes } from '../contracts/addresses';
import { SOMNIA_CHAIN_ID } from '../config/chains';

export interface MarketData {
  question: string;
  description: string;
  poolYes: bigint;
  poolNo: bigint;
  endTime: bigint;
  status: number; // 0 = Active, 1 = Resolved, 2 = Paused
  outcome: boolean;
  oracle: `0x${string}`;
}

export interface UserPosition {
  amount: bigint;
  outcome: boolean;
  timestamp: bigint;
  claimed: boolean;
}

export interface MarketOdds {
  yesOdds: bigint;
  noOdds: bigint;
}

/**
 * Hook to read market data from the contract
 */
export function useMarketData(marketId: string) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getMarket',
    args: [marketIdBytes],
    chainId: SOMNIA_CHAIN_ID,
  });

  const marketData: MarketData | null = data ? {
    question: data[0],
    description: data[1],
    poolYes: data[2],
    poolNo: data[3],
    endTime: data[4],
    status: data[5],
    outcome: data[6],
    oracle: data[7],
  } : null;

  return {
    market: marketData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read user's position in a market
 */
export function useUserPosition(marketId: string, userAddress: `0x${string}` | undefined) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getUserPosition',
    args: userAddress ? [marketIdBytes, userAddress] : undefined,
    chainId: SOMNIA_CHAIN_ID,
    query: {
      enabled: !!userAddress,
    },
  });

  const position: UserPosition | null = data ? {
    amount: data[0],
    outcome: data[1],
    timestamp: data[2],
    claimed: data[3],
  } : null;

  return {
    position,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read market odds
 */
export function useMarketOdds(marketId: string) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getMarketOdds',
    args: [marketIdBytes],
    chainId: SOMNIA_CHAIN_ID,
  });

  const odds: MarketOdds | null = data ? {
    yesOdds: data[0],
    noOdds: data[1],
  } : null;

  return {
    odds,
    isLoading,
    error,
  };
}

/**
 * Hook to get all user positions across markets
 */
export function useAllUserPositions(userAddress: `0x${string}` | undefined) {
  const { data: marketIds, isLoading: loadingIds } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getUserPositions',
    args: userAddress ? [userAddress] : undefined,
    chainId: SOMNIA_CHAIN_ID,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    marketIds: marketIds || [],
    isLoading: loadingIds,
  };
}
