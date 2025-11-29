import { useReadContract } from 'wagmi';
import { VaultABI } from '../contracts/VaultABI';
import { CONTRACT_ADDRESSES, getMarketIdBytes } from '../contracts/addresses';
import { SOMNIA_CHAIN_ID } from '../config/chains';

export interface ClaimableAmount {
  stake: bigint;
  winnings: bigint;
  yield: bigint;
  total: bigint;
}

/**
 * Hook to read total liquidity for a market
 */
export function useTotalLiquidity(marketId: string) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getTotalLiquidity',
    args: [marketIdBytes],
    chainId: SOMNIA_CHAIN_ID,
  });

  return {
    liquidity: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read yield generated for a market
 */
export function useYieldGenerated(marketId: string) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getYieldGenerated',
    args: [marketIdBytes],
    chainId: SOMNIA_CHAIN_ID,
  });

  return {
    yieldGenerated: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read current APY (in basis points)
 */
export function useCurrentAPY() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getCurrentAPY',
    chainId: SOMNIA_CHAIN_ID,
  });

  // Convert basis points to percentage (e.g., 1250 -> 12.50)
  const apyPercentage = data ? Number(data) / 100 : 0;

  return {
    apy: apyPercentage,
    apyBasisPoints: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read user's yield for a specific market
 */
export function useUserYield(marketId: string, userAddress: `0x${string}` | undefined) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getUserYield',
    args: userAddress ? [marketIdBytes, userAddress] : undefined,
    chainId: SOMNIA_CHAIN_ID,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    userYield: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to read claimable amount for a user in a market
 */
export function useClaimableAmount(marketId: string, userAddress: `0x${string}` | undefined) {
  const marketIdBytes = getMarketIdBytes(marketId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getClaimableAmount',
    args: userAddress ? [marketIdBytes, userAddress] : undefined,
    chainId: SOMNIA_CHAIN_ID,
    query: {
      enabled: !!userAddress,
    },
  });

  const claimable: ClaimableAmount | null = data ? {
    stake: data[0],
    winnings: data[1],
    yield: data[2],
    total: data[3],
  } : null;

  return {
    claimable,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Helper to format wei to display value
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  // Format with 2 decimal places
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
  return `${integerPart}.${fractionalStr}`;
}
