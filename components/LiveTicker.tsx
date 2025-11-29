import React, { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useSDS, useBetEvents, useBlockEvents } from '../hooks/useSDS';

export const LiveTicker: React.FC = () => {
  const { isConnected, lastBlockNumber } = useSDS();
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());
  const [events, setEvents] = useState<string[]>([
    "Waiting for blockchain events...",
  ]);

  // Subscribe to bet events from SDS
  useBetEvents((event) => {
    const newEvent = `New Bet: ${event.amount.toFixed(2)} STT on ${event.outcome} (${event.marketId})`;
    setEvents(prev => [newEvent, ...prev].slice(0, 3));
  });

  // Subscribe to block events from SDS
  useBlockEvents((block) => {
    setLastUpdate(new Date(block.timestamp).toLocaleTimeString());
    // Add block event to feed
    const newEvent = `Block #${block.blockNumber} confirmed`;
    setEvents(prev => {
      // Avoid duplicate block events
      if (prev[0]?.includes(`Block #${block.blockNumber}`)) return prev;
      return [newEvent, ...prev].slice(0, 3);
    });
  });

  // Update initial message when connected
  useEffect(() => {
    if (isConnected && lastBlockNumber > 0) {
      setEvents(prev => {
        if (prev[0] === "Waiting for blockchain events...") {
          return [`Connected to Somnia at block #${lastBlockNumber}`];
        }
        return prev;
      });
    }
  }, [isConnected, lastBlockNumber]);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 py-1 px-4 flex items-center justify-between text-xs text-slate-400 overflow-hidden">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-mono text-green-500 font-bold flex items-center gap-1">
              SDS Connected <Wifi size={10} />
            </span>
          </>
        ) : (
          <>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
            <span className="font-mono text-yellow-500 font-bold flex items-center gap-1">
              Connecting... <WifiOff size={10} />
            </span>
          </>
        )}
      </div>
      
      <div className="flex gap-8 overflow-hidden whitespace-nowrap mask-fade">
        {events.map((evt, i) => (
          <span key={i} className="flex items-center gap-1 opacity-80">
            <Activity size={10} /> {evt}
          </span>
        ))}
      </div>

      <div className="hidden md:block font-mono">
        Block #{lastBlockNumber || '---'} | {lastUpdate}
      </div>
    </div>
  );
};
