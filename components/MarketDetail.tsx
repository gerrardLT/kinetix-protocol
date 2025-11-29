import React, { useState, useEffect } from 'react';
import { Market, UserState } from '../types';
import { ArrowLeft, Sparkles, AlertCircle, Coins, Lock, TrendingUp, BarChart3, HelpCircle, Loader2 } from 'lucide-react';
import { analyzeMarketEvent } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePlaceBet } from '../hooks/usePlaceBet';
import { useWallet } from '../hooks/useWallet';

interface MarketDetailProps {
  market: Market;
  user: UserState;
  onBack: () => void;
  onPlaceBet: (marketId: string, outcome: 'YES' | 'NO', amount: number) => void;
  onConnect: () => void;
}

const generateYieldData = () => {
  const data = [];
  let val = 100;
  for (let i = 0; i < 30; i++) {
    val = val * (1 + (Math.random() * 0.05));
    data.push({ time: i, value: val });
  }
  return data;
};

export const MarketDetail: React.FC<MarketDetailProps> = ({ market, user, onBack, onPlaceBet, onConnect }) => {
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [yieldData, setYieldData] = useState(generateYieldData());
  
  // Real blockchain betting hook
  const { placeBet, isPending, isConfirming, isSuccess, isError, error, reset } = usePlaceBet();
  const { isConnected: walletConnected, connect, formattedBalance } = useWallet();
  
  const isBetting = isPending || isConfirming;
  const isConnected = walletConnected;
  const displayBalance = parseFloat(formattedBalance) || 0;

  const handleAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeMarketEvent(market.question, market.description);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setYieldData(prev => {
        const last = prev[prev.length - 1];
        const newVal = last.value * (1 + (Math.random() * 0.01));
        return [...prev.slice(1), { time: last.time + 1, value: newVal }];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const total = market.poolYes + market.poolNo;
  const yesRatio = total > 0 ? market.poolYes / total : 0.5;
  const noRatio = 1 - yesRatio;
  const yesMultiplier = (1 / yesRatio).toFixed(2);
  const noMultiplier = (1 / noRatio).toFixed(2);

  // Reset form on successful bet
  useEffect(() => {
    if (isSuccess) {
      setAmount('');
      reset();
    }
  }, [isSuccess, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (val > 0 && val <= displayBalance) {
      // Real blockchain bet only
      try {
        await placeBet(market.id, outcome, amount);
        // Notify parent to refetch data
        onPlaceBet(market.id, outcome, val);
      } catch (err) {
        console.error('Bet failed:', err);
      }
      setAmount('');
    }
  };

  const handleConnect = () => {
    connect();
    onConnect();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <div className="p-1 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
            <ArrowLeft size={16} /> 
        </div>
        <span className="font-medium text-sm">Back to Markets</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INFO & CHART (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8 border border-slate-800">
            {/* Header */}
            <div className="flex gap-5 items-start mb-8">
               <img src={market.image} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700/50 shadow-2xl" />
               <div>
                  <div className="flex gap-2 mb-2">
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {market.category}
                     </span>
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-400 border border-green-500/20 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> Live
                     </span>
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2 leading-tight">{market.question}</h1>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{market.description}</p>
               </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Pool Liquidity</div>
                <div className="text-xl font-mono text-white font-medium">${market.totalLiquidity.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Current APY</div>
                <div className="text-xl font-mono text-green-400 font-medium flex items-center gap-2">
                  {market.apy}% <TrendingUp size={14} />
                </div>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Yield Generated</div>
                <div className="text-xl font-mono text-purple-400 font-medium">+{typeof market.yieldGenerated === 'number' ? market.yieldGenerated.toFixed(8) : market.yieldGenerated}</div>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Oracle Source</div>
                <div className="text-sm text-slate-300 font-medium truncate flex items-center h-7">{market.resolutionSource}</div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-72 w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl p-6 border border-slate-800 mb-8 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 opacity-50"></div>
               <div className="flex justify-between items-center mb-4 relative z-10">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <BarChart3 size={14} /> Real-Time SDS Yield Feed
                  </h3>
                  <div className="flex gap-2">
                     {['1H', '1D', '1W'].map(t => (
                        <button key={t} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">{t}</button>
                     ))}
                  </div>
               </div>
               
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yieldData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#c084fc' }}
                      labelStyle={{ display: 'none' }}
                      cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>

            {/* AI Analysis */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Sparkles size={100} />
               </div>
               <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="flex items-center gap-2 font-bold text-indigo-300">
                        <Sparkles size={18} className="text-indigo-400" /> Kinetix AI Insight
                     </h3>
                     <button 
                        onClick={handleAnalysis}
                        disabled={loadingAi}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                     >
                        {loadingAi ? 'Analyzing...' : aiAnalysis ? 'Refresh Analysis' : 'Generate Analysis'}
                     </button>
                  </div>
                  
                  {aiAnalysis ? (
                     <div className="prose prose-invert prose-sm max-w-none text-indigo-100/80 leading-relaxed text-sm">
                        <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                     </div>
                  ) : (
                     <p className="text-sm text-indigo-300/60 italic">
                        Leverage Gemini AI to analyze market sentiment and key factors affecting this event. Click generate to start.
                     </p>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BETTING UI (4 cols) */}
        <div className="lg:col-span-4">
           <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700 sticky top-24 shadow-2xl shadow-black/50">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-white">Place Order</h2>
                 <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <Lock size={10} /> Secure Vault
                 </div>
              </div>
              
              {!isConnected ? (
                <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800 border-dashed">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Lock className="text-slate-500" size={20} />
                  </div>
                  <p className="text-slate-400 mb-4 text-sm px-4">Connect wallet to access prediction markets</p>
                  <button 
                    onClick={handleConnect}
                    className="w-full max-w-[200px] py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Outcome Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOutcome('YES')}
                      className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 ${outcome === 'YES' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <div className="text-lg">YES</div>
                      <div className="text-[10px] opacity-75 font-mono">x{yesMultiplier}</div>
                      {outcome === 'YES' && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_currentColor]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcome('NO')}
                      className={`relative py-4 rounded-xl font-bold text-sm transition-all border-2 ${outcome === 'NO' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      <div className="text-lg">NO</div>
                      <div className="text-[10px] opacity-75 font-mono">x{noMultiplier}</div>
                      {outcome === 'NO' && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_currentColor]" />}
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <label className="font-medium uppercase tracking-wider">Stake Amount</label>
                      <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setAmount(displayBalance.toString())}>
                        Bal: <span className="font-mono">{displayBalance.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-4 pr-16 text-white font-mono text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0.001"
                        step="0.001"
                        max={displayBalance}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-bold">SOMI</span>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-950/50 p-4 rounded-xl space-y-3 border border-slate-800">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Potential Payout</span>
                        <span className="text-white font-mono font-bold text-lg">
                          {amount ? (parseFloat(amount) * parseFloat(outcome === 'YES' ? yesMultiplier : noMultiplier)).toFixed(2) : '0.00'} <span className="text-sm text-slate-500">SOMI</span>
                        </span>
                     </div>
                     <div className="w-full h-px bg-slate-800"></div>
                     <div className="flex justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1"><Coins size={10} className="text-yellow-500"/> Est. Yield</span>
                        <span className="text-green-400 font-mono">+{market.apy}% APR</span>
                     </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={!amount || parseFloat(amount) > displayBalance || parseFloat(amount) <= 0 || isBetting}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isBetting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {isPending ? 'Confirming...' : 'Processing...'}
                      </>
                    ) : (
                      'Confirm Position'
                    )}
                  </button>
                  
                  {/* Transaction Status */}
                  {isError && error && (
                    <div className="flex gap-2 items-start text-[10px] text-red-400 leading-tight bg-red-900/10 p-2 rounded-lg border border-red-900/20">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <p>Transaction failed: {error.message}</p>
                    </div>
                  )}
                  
                  {isSuccess && (
                    <div className="flex gap-2 items-start text-[10px] text-green-400 leading-tight bg-green-900/10 p-2 rounded-lg border border-green-900/20">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <p>Bet placed successfully!</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 items-start text-[10px] text-slate-500 leading-tight bg-blue-900/10 p-2 rounded-lg border border-blue-900/20">
                    <AlertCircle size={12} className="mt-0.5 shrink-0 text-blue-400" />
                    <p>Funds are routed to Somnia Yield Vaults. You maintain principal exposure while earning DeFi yields during the lock period.</p>
                  </div>
                </form>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};