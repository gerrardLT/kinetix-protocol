import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MarketCard } from './components/MarketCard';
import { MarketDetail } from './components/MarketDetail';
import { Portfolio } from './components/Portfolio';
import { LiveTicker } from './components/LiveTicker';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary, MarketCardSkeleton } from './components/ErrorBoundary';
import { Market, UserState, ViewState } from './types';
import { useWallet } from './hooks/useWallet';
import { useAllOnChainMarkets } from './hooks/useOnChainMarkets';
import { useOnChainPositions } from './hooks/useUserPositions';
import { useSDS, useMarketUpdates, useYieldUpdates } from './hooks/useSDS';
import { Wifi, WifiOff } from 'lucide-react';

// Market List Component
const MarketList: React.FC<{
  markets: Market[];
  user: UserState;
  onConnect: () => void;
  onPlaceBet: (marketId: string, outcome: 'YES' | 'NO', amount: number) => void;
}> = ({ markets, user, onConnect, onPlaceBet }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold text-white mb-2">
          Yield-Bearing <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Prediction Markets</span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          The capital efficient prediction layer on Somnia. Predict outcomes while your collateral earns DeFi yields in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map(market => (
          <MarketCard 
            key={market.id} 
            market={market}
            user={user}
            onConnect={onConnect}
            onBet={onPlaceBet}
            onClick={(m: Market) => navigate(`/markets/${m.id}`)} 
          />
        ))}
      </div>
    </div>
  );
};

// Market Detail Wrapper Component
const MarketDetailWrapper: React.FC<{
  markets: Market[];
  user: UserState;
  onConnect: () => void;
  onPlaceBet: (marketId: string, outcome: 'YES' | 'NO', amount: number) => void;
}> = ({ markets, user, onConnect, onPlaceBet }) => {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  
  const market = markets.find(m => m.id === marketId);
  
  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-slate-400 mb-4">Market not found</p>
        <button 
          onClick={() => navigate('/markets')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
        >
          Back to Markets
        </button>
      </div>
    );
  }

  return (
    <MarketDetail 
      market={market} 
      user={user}
      onBack={() => navigate('/markets')}
      onPlaceBet={onPlaceBet}
      onConnect={onConnect}
    />
  );
};


// Portfolio Wrapper Component
const PortfolioWrapper: React.FC<{
  user: UserState;
  markets: Market[];
}> = ({ user, markets }) => {
  const navigate = useNavigate();
  
  return (
    <Portfolio 
      user={user} 
      markets={markets} 
      onNavigateToMarket={(marketId: string) => navigate(`/markets/${marketId}`)}
    />
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Real wallet connection - no mock fallback
  const { 
    isConnected, 
    address, 
    formattedBalance, 
    connect 
  } = useWallet();

  // SDS connection for real-time updates - only track connection status, not block number
  // Block number updates were causing excessive re-renders
  const { isConnected: sdsConnected } = useSDS();

  // Fetch markets from chain only
  const { markets: onChainMarkets, isLoading: loadingMarkets, refetch: refetchMarkets } = useAllOnChainMarkets();

  // Local state for real-time market updates from SDS
  const [markets, setMarkets] = useState<Market[]>([]);

  // Sync on-chain markets to local state
  useEffect(() => {
    if (onChainMarkets.length > 0) {
      setMarkets(onChainMarkets);
    }
  }, [onChainMarkets]);

  // Handle real-time market updates from SDS
  const handleMarketUpdate = useCallback((marketId: string, poolYesDelta: number, poolNoDelta: number) => {
    setMarkets((prev: Market[]) => prev.map((m: Market) => {
      if (m.id === marketId) {
        const newPoolYes = m.poolYes + poolYesDelta;
        const newPoolNo = m.poolNo + poolNoDelta;
        return {
          ...m,
          poolYes: newPoolYes,
          poolNo: newPoolNo,
          totalLiquidity: newPoolYes + newPoolNo,
        };
      }
      return m;
    }));
  }, []);

  // Handle real-time yield updates from SDS
  const handleYieldUpdate = useCallback((marketId: string, yieldDelta: number, newApy: number) => {
    setMarkets((prev: Market[]) => prev.map((m: Market) => {
      if (m.id === marketId) {
        return {
          ...m,
          yieldGenerated: m.yieldGenerated + yieldDelta,
          apy: newApy,
        };
      }
      return m;
    }));
  }, []);

  // Subscribe to SDS updates for all markets
  useMarketUpdates('m1', (update) => handleMarketUpdate('m1', update.poolYes, update.poolNo));
  useMarketUpdates('m2', (update) => handleMarketUpdate('m2', update.poolYes, update.poolNo));
  useMarketUpdates('m3', (update) => handleMarketUpdate('m3', update.poolYes, update.poolNo));
  
  useYieldUpdates('m1', (update) => handleYieldUpdate('m1', update.yieldGenerated, update.currentAPY));
  useYieldUpdates('m2', (update) => handleYieldUpdate('m2', update.yieldGenerated, update.currentAPY));
  useYieldUpdates('m3', (update) => handleYieldUpdate('m3', update.yieldGenerated, update.currentAPY));

  // Fetch user positions from chain only
  const { positions, refetch: refetchPositions } = useOnChainPositions(
    address as `0x${string}` | undefined
  );

  // Build user state from real data only
  const user: UserState = {
    isConnected,
    address: address || null,
    balance: parseFloat(formattedBalance) || 0,
    bets: positions,
  };

  // Refetch data when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      refetchMarkets();
      refetchPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // Handle wallet connection - only real wallet
  const handleConnect = () => {
    connect();
  };

  // Handle bet placement - just refetch after transaction
  const handlePlaceBet = (_marketId: string, _outcome: 'YES' | 'NO', _amount: number) => {
    setTimeout(() => {
      refetchMarkets();
      refetchPositions();
    }, 3000);
  };

  // Get current view for navbar highlighting
  const getCurrentView = (): ViewState => {
    if (location.pathname.startsWith('/markets')) return 'MARKET_LIST';
    if (location.pathname === '/portfolio') return 'PORTFOLIO';
    return 'MARKET_LIST';
  };

  // Handle view change from navbar
  const handleViewChange = (view: ViewState) => {
    switch (view) {
      case 'MARKET_LIST':
        navigate('/markets');
        break;
      case 'PORTFOLIO':
        navigate('/portfolio');
        break;
      default:
        navigate('/markets');
    }
  };

  // Loading state
  const LoadingState = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold text-white mb-2">
          Yield-Bearing <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Prediction Markets</span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Loading markets from Somnia blockchain...
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MarketCardSkeleton />
        <MarketCardSkeleton />
        <MarketCardSkeleton />
      </div>
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <p className="text-slate-400 mb-4">No markets found on chain</p>
      <button 
        onClick={() => refetchMarkets()}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
      >
        Retry
      </button>
    </div>
  );

  // Main app layout (non-landing pages)
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      {/* SDS Connection Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          sdsConnected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {sdsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {sdsConnected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>
      <LiveTicker />
      <Navbar 
        user={user} 
        onConnect={handleConnect} 
        onViewChange={handleViewChange}
        currentView={getCurrentView()}
      />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );

  return (
    <ErrorBoundary>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage onEnter={() => navigate('/markets')} />} />
        
        {/* Markets List */}
        <Route path="/markets" element={
          <MainLayout>
            {loadingMarkets ? <LoadingState /> : 
             markets.length === 0 ? <EmptyState /> :
             <MarketList 
               markets={markets} 
               user={user} 
               onConnect={handleConnect} 
               onPlaceBet={handlePlaceBet} 
             />}
          </MainLayout>
        } />
        
        {/* Market Detail */}
        <Route path="/markets/:marketId" element={
          <MainLayout>
            {loadingMarkets ? <LoadingState /> :
             <MarketDetailWrapper 
               markets={markets} 
               user={user} 
               onConnect={handleConnect} 
               onPlaceBet={handlePlaceBet} 
             />}
          </MainLayout>
        } />
        
        {/* Portfolio */}
        <Route path="/portfolio" element={
          <MainLayout>
            <PortfolioWrapper user={user} markets={markets} />
          </MainLayout>
        } />
        
        {/* Fallback - redirect to markets */}
        <Route path="*" element={
          <MainLayout>
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <p className="text-slate-400 mb-4">Page not found</p>
              <button 
                onClick={() => navigate('/markets')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
              >
                Go to Markets
              </button>
            </div>
          </MainLayout>
        } />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
