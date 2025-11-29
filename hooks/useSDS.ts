import { useState, useEffect, useCallback, useRef } from 'react';
import { sdsService, MarketUpdate, YieldUpdate, BetEvent, BlockEvent } from '../services/sdsService';

export interface UseSDSReturn {
  isConnected: boolean;
  lastBlockNumber: number;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Hook for managing SDS connection
 */
export function useSDS(): UseSDSReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastBlockNumber, setLastBlockNumber] = useState(0);

  useEffect(() => {
    // Subscribe to connection changes
    const unsubConnection = sdsService.onConnectionChange(setIsConnected);
    
    // Subscribe to block updates
    const unsubBlocks = sdsService.subscribeToBlocks((block) => {
      setLastBlockNumber(block.blockNumber);
    });

    // Auto-connect on mount
    sdsService.connect();

    return () => {
      unsubConnection();
      unsubBlocks();
    };
  }, []);

  const connect = useCallback(async () => {
    await sdsService.connect();
  }, []);

  const disconnect = useCallback(() => {
    sdsService.disconnect();
  }, []);

  return {
    isConnected,
    lastBlockNumber,
    connect,
    disconnect,
  };
}

/**
 * Hook for subscribing to market updates
 */
export function useMarketUpdates(
  marketId: string,
  onUpdate: (update: MarketUpdate) => void
): void {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const unsubscribe = sdsService.subscribeToMarket(marketId, (update) => {
      callbackRef.current(update);
    });

    return unsubscribe;
  }, [marketId]);
}

/**
 * Hook for subscribing to yield updates
 */
export function useYieldUpdates(
  marketId: string,
  onUpdate: (update: YieldUpdate) => void
): void {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const unsubscribe = sdsService.subscribeToYield(marketId, (update) => {
      callbackRef.current(update);
    });

    return unsubscribe;
  }, [marketId]);
}

/**
 * Hook for subscribing to bet events
 */
export function useBetEvents(onBet: (event: BetEvent) => void): void {
  const callbackRef = useRef(onBet);
  callbackRef.current = onBet;

  useEffect(() => {
    const unsubscribe = sdsService.subscribeToBets((event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, []);
}

/**
 * Hook for subscribing to block events
 */
export function useBlockEvents(onBlock: (event: BlockEvent) => void): void {
  const callbackRef = useRef(onBlock);
  callbackRef.current = onBlock;

  useEffect(() => {
    const unsubscribe = sdsService.subscribeToBlocks((event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, []);
}

/**
 * Hook that provides real-time market data with SDS updates
 */
export function useRealtimeMarket(marketId: string, initialData: {
  poolYes: number;
  poolNo: number;
  totalLiquidity: number;
  yieldGenerated: number;
  apy: number;
}) {
  const [data, setData] = useState(initialData);

  useMarketUpdates(marketId, (update) => {
    setData(prev => ({
      ...prev,
      poolYes: prev.poolYes + update.poolYes,
      poolNo: prev.poolNo + update.poolNo,
      totalLiquidity: prev.totalLiquidity + update.totalLiquidity,
    }));
  });

  useYieldUpdates(marketId, (update) => {
    setData(prev => ({
      ...prev,
      yieldGenerated: prev.yieldGenerated + update.yieldGenerated,
      apy: update.currentAPY,
    }));
  });

  return data;
}
