import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { SOMNIA_CHAIN_ID } from '../config/chains';

export interface UseWalletReturn {
  // Connection state
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Balance
  balance: bigint;
  formattedBalance: string;
  
  // Network
  chainId: number | undefined;
  isWrongNetwork: boolean;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  switchToSomnia: () => void;
  
  // Errors
  error: Error | null;
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Get native token balance (STT on Somnia)
  const { data: balanceData } = useBalance({
    address,
    chainId: SOMNIA_CHAIN_ID,
  });

  const isWrongNetwork = isConnected && chainId !== SOMNIA_CHAIN_ID;

  const handleConnect = () => {
    // Use the first available connector (MetaMask or injected)
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handleSwitchToSomnia = () => {
    switchChain({ chainId: SOMNIA_CHAIN_ID });
  };

  return {
    address,
    isConnected,
    isConnecting,
    balance: balanceData?.value ?? BigInt(0),
    formattedBalance: balanceData?.formatted ?? '0',
    chainId,
    isWrongNetwork,
    connect: handleConnect,
    disconnect,
    switchToSomnia: handleSwitchToSomnia,
    error: connectError ?? null,
  };
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
