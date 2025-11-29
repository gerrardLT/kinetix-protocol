import React, { useState } from 'react';
import { UserState, Market, MarketStatus } from '../types';
import { Trophy, TrendingUp, Wallet, ArrowUpRight, ShieldCheck, Loader2, CheckCircle, XCircle, History } from 'lucide-react';
import { useClaim, isWinningPosition } from '../hooks/useClaim';
import { useWallet } from '../hooks/useWallet';
import { useEnrichedPositions, usePortfolioStats } from '../hooks/useUserPositions';

interface PortfolioProps {
  user: UserState;
  markets: Market[];
  onNavigateToMarket?: (marketId: string) => void;
}

type TabType = 'active' | 'history';

export const Portfolio: React.FC<PortfolioProps> = ({ user, markets, onNavigateToMarket }) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const { claim, isPending, isConfirming } = useClaim();
  const { isConnected: walletConnected, formattedBalance } = useWallet();
  
  // Get enriched positions with yield calculations
  const enrichedPositions = useEnrichedPositions(user.bets, markets);
  const stats = usePortfolioStats(enrichedPositions);
  
  const isClaiming = isPending || isConfirming;
  const isConnected = walletConnected;
  const displayBalance = parseFloat(formattedBalance) || 0;
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center backdrop-blur-sm">
           <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
             <Wallet size={32} />
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Portfolio Locked</h2>
           <p className="text-slate-400 mb-8">Connect your wallet to track your positions, view accumulated yield, and claim winnings.</p>
        </div>
      </div>
    );
  }

  // Filter bets by tab
  const activeBets = user.bets.filter(bet => {
    const market = markets.find(m => m.id === bet.marketId);
    if (!market) return false;
    const isResolved = market.status === MarketStatus.RESOLVED;
    return activeTab === 'active' ? !isResolved : isResolved;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={16} /> Total Value Locked
            </div>
            <div className="text-4xl font-mono font-bold text-white mb-1">
              {stats.totalStaked.toLocaleString()} <span className="text-lg text-indigo-300">STT</span>
            </div>
            <div className="text-xs text-indigo-300/70">Across {stats.totalPositions} positions ({stats.activePositions} active)</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">
            <TrendingUp size={16} /> Est. Yield Earned
          </div>
          <div className="text-4xl font-mono font-bold text-emerald-400 mb-1">
            +{stats.totalYield.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">Auto-compounding in Somnia Vaults</div>
        </div>

        <div className="relative overflow-hidden bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
            <Wallet size={16} /> Available Balance
          </div>
          <div className="text-4xl font-mono font-bold text-white mb-1">
            {displayBalance.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">STT Tokens</div>
        </div>
      </div>

      {/* Positions List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {activeTab === 'active' ? 'Active Positions' : 'Position History'}
          </h2>
          <div className="flex gap-2">
             <button 
               onClick={() => setActiveTab('active')}
               className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                 activeTab === 'active' 
                   ? 'bg-slate-800 text-white border border-slate-700' 
                   : 'hover:bg-slate-800 text-slate-500'
               }`}
             >
               Active
             </button>
             <button 
               onClick={() => setActiveTab('history')}
               className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                 activeTab === 'history' 
                   ? 'bg-slate-800 text-white border border-slate-700' 
                   : 'hover:bg-slate-800 text-slate-500'
               }`}
             >
               <History size={12} /> History
             </button>
          </div>
        </div>

        <div className="p-2">
          {activeBets.length === 0 ? (
            <div className="text-center py-20">
               <div className="text-slate-600 mb-4 mx-auto w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                 {activeTab === 'active' ? <Trophy size={20} /> : <History size={20} />}
               </div>
               <p className="text-slate-500 italic">
                 {activeTab === 'active' 
                   ? 'No active bets found. Explore markets to start earning.' 
                   : 'No resolved positions yet. Your completed bets will appear here.'}
               </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeBets.map(bet => {
                const market = markets.find(m => m.id === bet.marketId);
                if (!market) return null;
                const isYes = bet.outcome === 'YES';
                const isResolved = market.status === MarketStatus.RESOLVED;
                // Use actual market outcome from contract if resolved
                const marketOutcome = market.outcome !== undefined ? market.outcome : (market.poolYes > market.poolNo);
                const isWinner = isResolved && isWinningPosition(isYes, marketOutcome, isResolved);
                const canClaim = isWinner && !bet.claimed;

                return (
                  <div key={bet.id} className="group bg-slate-900/50 hover:bg-slate-800 transition-colors rounded-xl p-4 border border-slate-800/50 hover:border-slate-700 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    
                    {/* Icon & Question */}
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 shadow-lg ${isYes ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {bet.outcome}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-200 truncate pr-4">{market.question}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                             {market.category}
                          </span>
                          {isResolved ? (
                            <span className={`flex items-center gap-1 text-xs ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                              {isWinner ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {isWinner ? 'Winner' : 'Lost'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                               <TrendingUp size={10} /> Yielding {market.apy}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid for Mobile / Row for Desktop */}
                    <div className="grid grid-cols-3 gap-4 w-full sm:w-auto sm:flex sm:items-center sm:gap-8 bg-slate-950/30 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                       <div className="text-center sm:text-right">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Staked</div>
                          <div className="font-mono text-sm text-white font-medium">{bet.amount}</div>
                       </div>
                       <div className="text-center sm:text-right">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Yield</div>
                          <div className="font-mono text-sm text-green-400 font-medium">
                            +{enrichedPositions.find(p => p.marketId === bet.marketId)?.estimatedYield.toFixed(2) || '0.00'}
                          </div>
                       </div>
                       <div className="text-center sm:text-right">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{isResolved ? 'Payout' : 'Max Payout'}</div>
                          <div className="font-mono text-sm text-purple-400 font-bold">
                            {isWinner 
                              ? (enrichedPositions.find(p => p.marketId === bet.marketId)?.claimableAmount || 0).toFixed(0) 
                              : isResolved ? '0' : (bet.amount * 1.8).toFixed(0)}
                          </div>
                       </div>
                    </div>

                    {/* Action */}
                    {canClaim ? (
                      <button 
                        onClick={() => claim(market.id)}
                        disabled={isClaiming}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isClaiming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {isClaiming ? 'Claiming...' : 'Claim'}
                      </button>
                    ) : bet.claimed ? (
                      <div className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-400 font-medium rounded-lg flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Claimed
                      </div>
                    ) : (
                      <button 
                        onClick={() => onNavigateToMarket?.(market.id)}
                        className="w-full sm:w-auto p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                        title="View Market Details"
                      >
                         <ArrowUpRight size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};