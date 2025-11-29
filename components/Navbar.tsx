import React from 'react';
import { UserState } from '../types';
import { Wallet, CircleUserRound, AlertTriangle } from 'lucide-react';
import { useWallet, formatAddress } from '../hooks/useWallet';

interface NavbarProps {
  user: UserState;
  onConnect: () => void;
  onViewChange: (view: any) => void;
  currentView: any;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onConnect, onViewChange, currentView }) => {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    formattedBalance, 
    isWrongNetwork, 
    connect, 
    disconnect,
    switchToSomnia 
  } = useWallet();

  // Use real wallet connection only
  const displayConnected = isConnected;
  const displayAddress = address ? formatAddress(address) : null;
  const displayBalance = formattedBalance;

  const handleConnect = () => {
    connect();
    onConnect();
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div 
              className="flex-shrink-0 cursor-pointer flex items-center gap-2 group"
              onClick={() => onViewChange('MARKET_LIST')}
            >
              <img 
                src="https://image.pollinations.ai/prompt/Modern%20crypto%20logo%2C%20letter%20K%20formed%20by%20three%20racing%20track%20lanes%20converging%20into%20one%20point%2C%20speed%20lines%20effect%2C%20gradient%20from%20cyan%20to%20purple%2C%20glowing%20neon%20style%2C%20dark%20background%2C%20minimalist%20vector%20design%2C%20no%20text%2C%20icon%20only%2C%20fintech%20blockchain%20aesthetic?seed=123&width=512&height=512"
                alt="Kinetix Logo"
                className="w-8 h-8 rounded-lg shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all"
              />
              <span className="font-bold text-xl text-white tracking-tight">
                Kinetix <span className="text-purple-400 font-normal">Protocol</span>
              </span>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <button 
                  onClick={() => onViewChange('MARKET_LIST')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'MARKET_LIST' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                >
                  Markets
                </button>
                <button 
                  onClick={() => onViewChange('PORTFOLIO')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'PORTFOLIO' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                >
                  Portfolio
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Wrong Network Warning */}
            {isWrongNetwork && (
              <button
                onClick={switchToSomnia}
                className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-500/30 transition-colors"
              >
                <AlertTriangle size={14} />
                Switch to Somnia
              </button>
            )}

            {displayConnected ? (
              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-400">Balance</div>
                    <div className="text-sm font-mono text-green-400 font-bold">{displayBalance} STT</div>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
                    <CircleUserRound size={16} className="text-purple-400" />
                    <span className="text-sm font-mono text-white">{displayAddress}</span>
                 </div>
                 <button
                    onClick={() => disconnect()}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                    title="Disconnect Wallet"
                 >
                    Disconnect
                 </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-200 px-4 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-50"
              >
                <Wallet size={16} />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
