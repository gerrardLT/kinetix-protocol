import { useMemo, useCallback } from 'react';
import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { MarketABI } from '../contracts/MarketABI';
import { CONTRACT_ADDRESSES, MARKET_IDS } from '../contracts/addresses';
import { SOMNIA_CHAIN_ID } from '../config/chains';
import { Bet, Market, MarketStatus } from '../types';

export interface EnrichedPosition {
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  timestamp: number;
  claimed: boolean;
  estimatedYield: number;
  claimableAmount: number;
  isWinner: boolean | null; // null if market not resolved
}

/**
 * Calculate estimated yield for a position
 * Formula: amount * APY * durationDays / 365
 */
export function calculateEstimatedYield(
  amount: number,
  apyPercent: number,
  startTimestamp: number
): number {
  const now = Date.now();
  const durationMs = now - startTimestamp;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  
  return (amount * (apyPercent / 100) * durationDays) / 365;
}

/**
 * Determine if a position is a winner
 */
export function determineWinStatus(
  positionOutcome: 'YES' | 'NO',
  market: Market
): boolean | null {
  if (market.status !== MarketStatus.RESOLVED) {
    return null; // Market not resolved yet
  }
  
  // Use actual market outcome from contract if available
  // market.outcome is true for YES, false for NO
  if (market.outcome !== undefined) {
    const marketOutcome = market.outcome ? 'YES' : 'NO';
    return positionOutcome === marketOutcome;
  }
  
  // Fallback: determine outcome based on pool sizes (for demo)
  const marketOutcome = market.poolYes > market.poolNo ? 'YES' : 'NO';
  return positionOutcome === marketOutcome;
}

/**
 * Hook to get enriched user positions with yield and win status
 */
export function useEnrichedPositions(
  bets: Bet[],
  markets: Market[]
): EnrichedPosition[] {
  return useMemo(() => {
    return bets.map(bet => {
      const market = markets.find(m => m.id === bet.marketId);
      if (!market) {
        return {
          marketId: bet.marketId,
          outcome: bet.outcome,
          amount: bet.amount,
          timestamp: bet.timestamp,
          claimed: bet.claimed,
          estimatedYield: 0,
          claimableAmount: 0,
          isWinner: null,
        };
      }

      const estimatedYield = calculateEstimatedYield(
        bet.amount,
        market.apy,
        bet.timestamp
      );

      const isWinner = determineWinStatus(bet.outcome, market);
      
      // Calculate claimable amount for winners
      let claimableAmount = 0;
      if (isWinner === true && !bet.claimed) {
        const total = market.poolYes + market.poolNo;
        const winningPool = bet.outcome === 'YES' ? market.poolYes : market.poolNo;
        const losingPool = bet.outcome === 'YES' ? market.poolNo : market.poolYes;
        
        // Stake + share of losing pool + yield
        const winnings = winningPool > 0 ? (bet.amount / winningPool) * losingPool : 0;
        claimableAmount = bet.amount + winnings + estimatedYield;
      }

      return {
        marketId: bet.marketId,
        outcome: bet.outcome,
        amount: bet.amount,
        timestamp: bet.timestamp,
        claimed: bet.claimed,
        estimatedYield,
        claimableAmount,
        isWinner,
      };
    });
  }, [bets, markets]);
}

/**
 * Hook to get portfolio summary statistics
 */
export function usePortfolioStats(positions: EnrichedPosition[]) {
  return useMemo(() => {
    const totalStaked = positions.reduce((sum, p) => sum + p.amount, 0);
    const totalYield = positions.reduce((sum, p) => sum + p.estimatedYield, 0);
    const totalClaimable = positions
      .filter(p => p.isWinner === true && !p.claimed)
      .reduce((sum, p) => sum + p.claimableAmount, 0);
    
    const activePositions = positions.filter(p => p.isWinner === null).length;
    const wonPositions = positions.filter(p => p.isWinner === true).length;
    const lostPositions = positions.filter(p => p.isWinner === false).length;

    return {
      totalStaked,
      totalYield,
      totalClaimable,
      activePositions,
      wonPositions,
      lostPositions,
      totalPositions: positions.length,
    };
  }, [positions]);
}


/**
 * Hook to fetch user positions from on-chain data
 */
export function useOnChainPositions(userAddress: `0x${string}` | undefined) {
  const marketKeys: ('m1' | 'm2' | 'm3')[] = ['m1', 'm2', 'm3'];

  // Read positions for all markets
  const { data: positionsData, isLoading, refetch } = useReadContracts({
    contracts: marketKeys.map(key => ({
      address: CONTRACT_ADDRESSES.MARKET,
      abi: MarketABI,
      functionName: 'getUserPosition' as const,
      args: userAddress ? [MARKET_IDS[key], userAddress] as const : undefined,
      chainId: SOMNIA_CHAIN_ID,
    })),
    query: {
      enabled: !!userAddress,
    },
  } as any);

  const positions = useMemo(() => {
    if (!positionsData || !userAddress) return [];

    const result: Bet[] = [];
    
    marketKeys.forEach((key, index) => {
      const posResult = positionsData[index];
      if (posResult.status !== 'success' || !posResult.result) return;

      const [amount, outcome, timestamp, claimed] = posResult.result as unknown as [bigint, boolean, bigint, boolean];
      
      // Skip if no position (amount = 0)
      if (amount === 0n) return;

      result.push({
        id: `${key}-${userAddress}`,
        marketId: key,
        outcome: outcome ? 'YES' : 'NO',
        amount: Number(formatEther(amount)),
        timestamp: Number(timestamp) * 1000, // Convert to milliseconds
        claimed,
      });
    });

    return result;
  }, [positionsData, userAddress]);

  const stableRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return { positions, isLoading, refetch: stableRefetch };
}

/**
 * Combined hook that merges on-chain positions with local bets
 * Prioritizes on-chain data when available
 */
export function useCombinedPositions(
  localBets: Bet[],
  userAddress: `0x${string}` | undefined
) {
  const { positions: onChainPositions, isLoading } = useOnChainPositions(userAddress);

  const combinedPositions = useMemo(() => {
    if (!userAddress) return localBets;
    
    // Create a map of on-chain positions by marketId
    const onChainMap = new Map(onChainPositions.map(p => [p.marketId, p]));
    
    // Merge: prefer on-chain data, add local bets that aren't on-chain yet
    const merged: Bet[] = [...onChainPositions];
    
    localBets.forEach(bet => {
      if (!onChainMap.has(bet.marketId)) {
        // This bet might be pending confirmation, include it
        merged.push(bet);
      }
    });

    return merged;
  }, [localBets, onChainPositions, userAddress]);

  return { positions: combinedPositions, isLoading };
}
