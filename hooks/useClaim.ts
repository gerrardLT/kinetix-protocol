import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MarketABI } from '../contracts/MarketABI';
import { CONTRACT_ADDRESSES, getMarketIdBytes } from '../contracts/addresses';

export type ClaimStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export interface UseClaimReturn {
  claim: (marketId: string) => Promise<void>;
  status: ClaimStatus;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
}

/**
 * Hook for claiming winnings from resolved prediction markets
 * Handles transaction submission and confirmation
 */
export function useClaim(): UseClaimReturn {
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const { 
    writeContract, 
    data: txHash, 
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const claim = useCallback(async (marketId: string) => {
    try {
      setStatus('pending');
      setError(null);

      const marketIdBytes = getMarketIdBytes(marketId);

      writeContract({
        address: CONTRACT_ADDRESSES.MARKET,
        abi: MarketABI,
        functionName: 'claimWinnings',
        args: [marketIdBytes],
      } as any);

      setStatus('confirming');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to claim winnings'));
    }
  }, [writeContract]);

  // Update status based on transaction state
  const currentStatus: ClaimStatus = 
    isSuccess ? 'success' :
    isConfirming ? 'confirming' :
    isWritePending ? 'pending' :
    (writeError || confirmError) ? 'error' :
    status;

  const currentError = writeError || confirmError || error;

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    resetWrite();
  }, [resetWrite]);

  return {
    claim,
    status: currentStatus,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    isError: currentStatus === 'error',
    error: currentError instanceof Error ? currentError : null,
    txHash,
    reset,
  };
}

/**
 * Calculate payout for a winning position
 * Formula: stake + (stake/winningPool * losingPool) + (stake/totalPool * yield)
 */
export function calculatePayout(
  stake: bigint,
  winningPool: bigint,
  losingPool: bigint,
  totalYield: bigint
): { stake: bigint; winnings: bigint; yield: bigint; total: bigint } {
  const totalPool = winningPool + losingPool;
  
  // Winnings from losing side (proportional to stake)
  const winnings = winningPool > 0n 
    ? (stake * losingPool) / winningPool 
    : 0n;
  
  // Yield share (proportional to stake in total pool)
  const yieldShare = totalPool > 0n 
    ? (stake * totalYield) / totalPool 
    : 0n;
  
  return {
    stake,
    winnings,
    yield: yieldShare,
    total: stake + winnings + yieldShare,
  };
}

/**
 * Check if a position is a winner
 */
export function isWinningPosition(
  positionOutcome: boolean, 
  marketOutcome: boolean, 
  marketResolved: boolean
): boolean {
  return marketResolved && positionOutcome === marketOutcome;
}
