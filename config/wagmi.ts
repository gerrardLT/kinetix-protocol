import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { somniaTestnet } from './chains';

/**
 * Wagmi Configuration for Kinetix Protocol
 * - Supports Somnia Testnet
 * - Uses MetaMask and generic injected connectors
 */
export const wagmiConfig = createConfig({
  chains: [somniaTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Kinetix Protocol',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
    injected(), // Fallback for other wallets
  ],
  transports: {
    [somniaTestnet.id]: http('https://dream-rpc.somnia.network'),
  },
});

// Re-export for convenience
export { somniaTestnet };
