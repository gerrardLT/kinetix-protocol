import { defineChain } from 'viem';

/**
 * Somnia Testnet Chain Configuration
 * Chain ID: 50312
 * RPC: https://dream-rpc.somnia.network
 * Explorer: https://somnia-testnet.socialscan.io
 */
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    name: 'Somnia Test Token',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia-testnet.socialscan.io',
    },
  },
  testnet: true,
});

// SOMI Token address on Somnia Testnet (placeholder - update with actual deployed address)
export const SOMI_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Chain ID constant for validation
export const SOMNIA_CHAIN_ID = 50312;
