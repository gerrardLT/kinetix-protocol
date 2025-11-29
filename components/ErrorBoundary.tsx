import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="bg-slate-900/50 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading skeleton component for async data
 */
export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800 rounded ${className}`} />
);

/**
 * Market card loading skeleton
 */
export const MarketCardSkeleton: React.FC = () => (
  <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
    <LoadingSkeleton className="h-32 w-full rounded-none" />
    <div className="p-5 space-y-4">
      <LoadingSkeleton className="h-6 w-3/4" />
      <LoadingSkeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <LoadingSkeleton className="h-10 flex-1" />
        <LoadingSkeleton className="h-10 flex-1" />
      </div>
      <div className="flex justify-between pt-4 border-t border-slate-800">
        <LoadingSkeleton className="h-8 w-20" />
        <LoadingSkeleton className="h-8 w-20" />
      </div>
    </div>
  </div>
);

/**
 * Connection status indicator
 */
export const ConnectionStatus: React.FC<{ isConnected: boolean; label?: string }> = ({ 
  isConnected, 
  label 
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className={`flex h-2 w-2 relative ${isConnected ? '' : 'animate-pulse'}`}>
      {isConnected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
    </span>
    {label && (
      <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
        {label}
      </span>
    )}
  </div>
);
