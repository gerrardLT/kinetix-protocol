import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { MarketABI } from '../contracts/MarketABI';
import { CONTRACT_ADDRESSES, getMarketIdBytes } from '../contracts/addresses';

export type BetStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export interface UsePlaceBetReturn {
  placeBet: (marketId: string, outcome: 'YES' | 'NO', amount: string) => Promise<void>;
  status: BetStatus;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
}

/**
 * Hook for placing bets on prediction markets
 * Handles transaction submission and confirmation
 */
export function usePlaceBet(): UsePlaceBetReturn {
  const [status, setStatus] = useState<BetStatus>('idle');
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

  const placeBet = useCallback(async (
    marketId: string, 
    outcome: 'YES' | 'NO', 
    amount: string
  ) => {
    try {
      setStatus('pending');
      setError(null);

      const marketIdBytes = getMarketIdBytes(marketId);
      const amountWei = parseEther(amount);
      const outcomeBool = outcome === 'YES';

      writeContract({
        address: CONTRACT_ADDRESSES.MARKET,
        abi: MarketABI,
        functionName: 'placeBet',
        args: [marketIdBytes, outcomeBool],
        value: amountWei, // Send native token as bet amount
      } as any);

      setStatus('confirming');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to place bet'));
    }
  }, [writeContract]);

  // Update status based on transaction state
  const currentStatus: BetStatus = 
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
    placeBet,
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
 * Helper to validate bet amount
 */
export function validateBetAmount(
  amount: string, 
  balance: bigint, 
  minBet: bigint = BigInt(0)
): { valid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Please enter an amount' };
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  try {
    const amountWei = parseEther(amount);
    
    if (amountWei < minBet) {
      return { valid: false, error: 'Amount below minimum bet' };
    }
    
    if (amountWei > balance) {
      return { valid: false, error: 'Insufficient balance' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid amount format' };
  }
}
