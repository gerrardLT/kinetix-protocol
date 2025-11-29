import { useCallback, useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { MarketABI } from '../contracts/MarketABI';
import { VaultABI } from '../contracts/VaultABI';
import { CONTRACT_ADDRESSES, MARKET_IDS } from '../contracts/addresses';
import { SOMNIA_CHAIN_ID } from '../config/chains';
import { Market, MarketStatus } from '../types';

// Market ID to key mapping (reverse lookup)
const MARKET_ID_TO_KEY: Record<string, string> = {
  '0x83267a439473d40c510063b30f7c06d1e3bf496ea5e34c5e3290dfc7dc527ce1': 'm1',
  '0x4c7b5cd57855cee824dfb36438b88ecb25d2d1493a0c53b69912ec4957d84d68': 'm2',
  '0x7ad03d14656a059c9413d59d5609716f0def9014d30d8d88904e8f9eed6b99d8': 'm3',
};

// Market metadata (fallback for known markets)
const MARKET_METADATA: Record<string, { category: string; image: string; resolutionSource: string }> = {
  m1: { category: 'Crypto', image: 'https://picsum.photos/400/200?random=1', resolutionSource: 'Chainlink Oracle' },
  m2: { category: 'Ecosystem', image: 'https://picsum.photos/400/200?random=2', resolutionSource: 'Official Announcement' },
  m3: { category: 'Macro', image: 'https://picsum.photos/400/200?random=3', resolutionSource: 'Federal Reserve' },
};

const DEFAULT_METADATA = { category: 'General', image: 'https://picsum.photos/400/200?random=99', resolutionSource: 'Oracle' };

function getMarketStatus(status: number): MarketStatus {
  switch (status) {
    case 0: return MarketStatus.ACTIVE;
    case 1: return MarketStatus.RESOLVED;
    case 2: return MarketStatus.PAUSED;
    default: return MarketStatus.ACTIVE;
  }
}

function formatEndDate(endTime: bigint): string {
  return new Date(Number(endTime) * 1000).toISOString().split('T')[0];
}

function getMarketKey(marketIdHex: string): string {
  return MARKET_ID_TO_KEY[marketIdHex.toLowerCase()] || `market-${marketIdHex.slice(0, 10)}`;
}

function getMarketMetadata(marketKey: string) {
  return MARKET_METADATA[marketKey] || DEFAULT_METADATA;
}


export function useOnChainMarket(marketKey: 'm1' | 'm2' | 'm3') {
  const marketId = MARKET_IDS[marketKey];

  const { data: marketData, isLoading: loadingMarket, refetch: refetchMarket } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getMarket',
    args: [marketId],
    chainId: SOMNIA_CHAIN_ID,
    query: { refetchInterval: false, staleTime: 30000 }, // Disable auto-refresh, cache for 30s
  });

  const { data: vaultData, isLoading: loadingVault } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getYieldGenerated',
    args: [marketId],
    chainId: SOMNIA_CHAIN_ID,
    query: { refetchInterval: false, staleTime: 30000 },
  });

  const { data: apyData } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getCurrentAPY',
    chainId: SOMNIA_CHAIN_ID,
    query: { refetchInterval: false, staleTime: 30000 },
  });

  const isLoading = loadingMarket || loadingVault;

  if (!marketData || isLoading) {
    return { market: null, isLoading, refetch: refetchMarket };
  }

  const [question, description, poolYes, poolNo, endTime, status, outcome] = marketData;
  const metadata = MARKET_METADATA[marketKey];
  const yieldGenerated = vaultData ? Number(formatEther(vaultData)) : 0;
  const apy = apyData ? Number(apyData) / 100 : 12.5;

  const market: Market = {
    id: marketKey,
    question,
    description,
    poolYes: Number(formatEther(poolYes)),
    poolNo: Number(formatEther(poolNo)),
    totalLiquidity: Number(formatEther(poolYes + poolNo)),
    yieldGenerated,
    apy,
    endDate: formatEndDate(endTime),
    status: getMarketStatus(status),
    outcome,
    category: metadata.category,
    image: metadata.image,
    resolutionSource: metadata.resolutionSource,
  };

  return { market, isLoading, refetch: refetchMarket };
}


/**
 * Hook to dynamically fetch all markets from chain
 */
export function useAllOnChainMarkets() {
  // Get all market IDs from the contract
  const { data: allMarketIds, isLoading: loadingIds, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESSES.MARKET,
    abi: MarketABI,
    functionName: 'getAllMarkets',
    chainId: SOMNIA_CHAIN_ID,
    query: { refetchInterval: false, staleTime: 60000 }, // Cache for 60s
  });

  // Use contract data or fallback to known IDs
  const marketIdsList: `0x${string}`[] = allMarketIds && allMarketIds.length > 0
    ? (allMarketIds as `0x${string}`[])
    : [MARKET_IDS.m1, MARKET_IDS.m2, MARKET_IDS.m3];

  // Batch read all market data
  const { data: marketsData, isLoading: loadingMarkets, refetch: refetchMarkets } = useReadContracts({
    contracts: marketIdsList.map(marketId => ({
      address: CONTRACT_ADDRESSES.MARKET,
      abi: MarketABI,
      functionName: 'getMarket' as const,
      args: [marketId] as const,
      chainId: SOMNIA_CHAIN_ID,
    })),
    query: { enabled: marketIdsList.length > 0, refetchInterval: false, staleTime: 30000 },
  } as any);

  // Batch read yield data
  const { data: yieldsData, isLoading: loadingYields } = useReadContracts({
    contracts: marketIdsList.map(marketId => ({
      address: CONTRACT_ADDRESSES.VAULT,
      abi: VaultABI,
      functionName: 'getYieldGenerated' as const,
      args: [marketId] as const,
      chainId: SOMNIA_CHAIN_ID,
    })),
    query: { enabled: marketIdsList.length > 0, refetchInterval: false, staleTime: 30000 },
  } as any);

  // Read current APY
  const { data: apyData } = useReadContract({
    address: CONTRACT_ADDRESSES.VAULT,
    abi: VaultABI,
    functionName: 'getCurrentAPY',
    chainId: SOMNIA_CHAIN_ID,
    query: { refetchInterval: false, staleTime: 30000 },
  });

  const isLoading = loadingIds || loadingMarkets || loadingYields;
  
  const refetch = useCallback(() => { 
    refetchIds(); 
    refetchMarkets(); 
  }, [refetchIds, refetchMarkets]);

  const markets = useMemo(() => {
    if (!marketsData) return [];

    const apy = apyData ? Number(apyData) / 100 : 12.5;

    return marketIdsList.map((marketIdHex, index) => {
      const result = marketsData[index];
      const yieldResult = yieldsData?.[index];
      const marketKey = getMarketKey(marketIdHex);
      const metadata = getMarketMetadata(marketKey);

      if (result.status !== 'success' || !result.result) {
        return {
          id: marketKey, question: `Market ${marketKey}`, description: 'Loading...',
          poolYes: 0, poolNo: 0, totalLiquidity: 0, yieldGenerated: 0, apy,
          endDate: '2025-12-31', status: MarketStatus.ACTIVE,
          category: metadata.category, image: metadata.image, resolutionSource: metadata.resolutionSource,
        };
      }

      const [question, description, poolYes, poolNo, endTime, status, outcome] = result.result as [string, string, bigint, bigint, bigint, number, boolean, string];
      const yieldGenerated = yieldResult?.status === 'success' && yieldResult.result ? Number(formatEther(yieldResult.result as bigint)) : 0;

      if (!question || question.trim() === '') return null;

      return {
        id: marketKey, question, description,
        poolYes: Number(formatEther(poolYes)), poolNo: Number(formatEther(poolNo)),
        totalLiquidity: Number(formatEther(poolYes + poolNo)), yieldGenerated, apy,
        endDate: formatEndDate(endTime), status: getMarketStatus(status), outcome,
        category: metadata.category, image: metadata.image, resolutionSource: metadata.resolutionSource,
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null) as Market[];
  }, [marketsData, yieldsData, apyData, marketIdsList]);

  if (isLoading) {
    return { markets: [], isLoading, refetch };
  }

  return { markets, isLoading, refetch };
}
