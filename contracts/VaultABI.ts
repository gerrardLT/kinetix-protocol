/**
 * Kinetix Vault Contract ABI
 * Handles yield generation and fund management
 */
export const VaultABI = [
  // Read Functions
  {
    name: 'getTotalLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint256' }],
  },
  {
    name: 'getYieldGenerated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [{ name: 'yield', type: 'uint256' }],
  },
  {
    name: 'getCurrentAPY',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'apy', type: 'uint256' }], // In basis points (e.g., 1250 = 12.50%)
  },
  {
    name: 'getUserYield',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: 'yield', type: 'uint256' }],
  },
  {
    name: 'getClaimableAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'stake', type: 'uint256' },
      { name: 'winnings', type: 'uint256' },
      { name: 'yield', type: 'uint256' },
      { name: 'total', type: 'uint256' },
    ],
  },
  // Events
  {
    name: 'YieldGenerated',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newAPY', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'FundsDeposited',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
