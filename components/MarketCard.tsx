import React, { useState, useEffect } from 'react';
import { Market, UserState } from '../types';
import { TrendingUp, Clock, Zap, Check, X, Wallet, Loader2 } from 'lucide-react';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useWallet } from '../hooks/useWallet';

interface MarketCardProps {
  market: Market;
  user: UserState;
  onClick: (market: Market) => void;
  onBet: (marketId: string, outcome: 'YES' | 'NO', amount: number) => void;
  onConnect: () => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market, user, onClick, onBet, onConnect }) => {
  const [bettingOutcome, setBettingOutcome] = useState<'YES' | 'NO' | null>(null);
  const [amount, setAmount] = useState('');
  
  // Real blockchain betting hook
  const { placeBet, isPending, isConfirming, isSuccess, isError, reset } = usePlaceBet();
  const { isConnected: walletConnected, connect } = useWallet();
  
  const isBetting = isPending || isConfirming;

  const total = market.poolYes + market.poolNo;
  const yesPercent = total > 0 ? (market.poolYes / total) * 100 : 50;
  
  // Dynamic color based on category
  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'Crypto': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'Macro': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    }
  };

  // Reset form on successful bet
  useEffect(() => {
    if (isSuccess) {
      setBettingOutcome(null);
      setAmount('');
      reset();
    }
  }, [isSuccess, reset]);

  const handleQuickBetClick = (e: React.MouseEvent, outcome: 'YES' | 'NO') => {
    e.stopPropagation();
    if (!walletConnected) {
        connect();
        onConnect();
        return;
    }
    setBettingOutcome(outcome);
    setAmount('');
  };

  const handleConfirmBet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const val = parseFloat(amount);
    if (val > 0 && val <= user.balance && bettingOutcome) {
        // Real blockchain bet only
        try {
          await placeBet(market.id, bettingOutcome, amount);
          // Notify parent to refetch data
          onBet(market.id, bettingOutcome, val);
        } catch (err) {
          console.error('Bet failed:', err);
        }
        setBettingOutcome(null);
        setAmount('');
    }
  };

  const handleCancelBet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBettingOutcome(null);
    setAmount('');
    reset();
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      onClick={() => onClick(market)}
      className="group relative bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-slate-600 cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col h-full"
    >
      {/* Top Image/Header Area */}
      <div className="relative h-32 w-full overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent z-10" />
        <img 
          src={market.image} 
          alt={market.question} 
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
        />
        <div className="absolute top-3 left-3 z-20">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getCategoryColor(market.category)}`}>
            {market.category}
          </span>
        </div>
        <div className="absolute top-3 right-3 z-20">
           <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur text-green-400 text-xs font-bold px-2 py-1 rounded-full border border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
              <TrendingUp size={12} />
              {market.apy}% APY
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pt-2 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-100 mb-3 leading-snug group-hover:text-purple-400 transition-colors line-clamp-2 min-h-[3.5rem]">
          {market.question}
        </h3>

        {/* Prediction Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
            <span className="text-emerald-400">YES {yesPercent.toFixed(0)}%</span>
            <span className="text-rose-400">NO {(100 - yesPercent).toFixed(0)}%</span>
          </div>
          <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-950 z-10"></div>
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-500" 
              style={{ width: `${yesPercent}%` }}
            />
            <div 
              className="absolute top-0 right-0 h-full bg-slate-700 transition-all duration-500" 
              style={{ width: `${100 - yesPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Bet Interface */}
        <div className="mt-auto mb-4">
            {bettingOutcome ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-950 rounded-xl p-2 border border-slate-700 flex items-center gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onClick={handleInputClick}
                            placeholder="Amount"
                            autoFocus
                            min="0.001"
                            step="0.001"
                            className="w-full bg-transparent border-none text-white text-sm font-mono placeholder:text-slate-600 focus:ring-0 p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">SOMI</span>
                    </div>
                    <button 
                        onClick={handleConfirmBet}
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > user.balance || isBetting}
                        className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBetting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button 
                        onClick={handleCancelBet}
                        className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => handleQuickBetClick(e, 'YES')}
                        className="flex-1 py-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow-emerald-500/20"
                    >
                        Bet YES
                    </button>
                    <button 
                        onClick={(e) => handleQuickBetClick(e, 'NO')}
                        className="flex-1 py-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow-rose-500/20"
                    >
                        Bet NO
                    </button>
                </div>
            )}
        </div>

        {/* Footer Stats */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
           <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Liquidity</span>
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                 <Zap size={12} className="text-yellow-500"/>
                 ${(market.totalLiquidity / 1000).toFixed(1)}k
              </span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Ends In</span>
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                 <Clock size={12} />
                 {market.endDate}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};