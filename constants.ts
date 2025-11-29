import { Market, MarketStatus } from './types';

export const INITIAL_MARKETS: Market[] = [
  {
    id: 'm1',
    question: 'Will Bitcoin break $100k by Q4 2025?',
    description: 'Prediction market based on the price of BTC/USD on major exchanges.',
    poolYes: 150000,
    poolNo: 85000,
    totalLiquidity: 235000,
    yieldGenerated: 420.50,
    apy: 12.5,
    endDate: '2025-12-31',
    status: MarketStatus.ACTIVE,
    category: 'Crypto',
    image: 'https://picsum.photos/400/200?random=1',
    resolutionSource: 'Chainlink Oracle'
  },
  {
    id: 'm2',
    question: 'Will Somnia Mainnet launch before June 2025?',
    description: 'Based on official announcements from the Somnia Foundation.',
    poolYes: 50000,
    poolNo: 2000,
    totalLiquidity: 52000,
    yieldGenerated: 150.20,
    apy: 15.8,
    endDate: '2025-06-01',
    status: MarketStatus.ACTIVE,
    category: 'Ecosystem',
    image: 'https://picsum.photos/400/200?random=2',
    resolutionSource: 'Official Announcement'
  },
  {
    id: 'm3',
    question: 'Will the Fed cut interest rates in the next FOMC meeting?',
    description: 'Binary outcome based on the official Federal Reserve statement.',
    poolYes: 200000,
    poolNo: 210000,
    totalLiquidity: 410000,
    yieldGenerated: 890.00,
    apy: 8.2,
    endDate: '2024-11-07',
    status: MarketStatus.ACTIVE,
    category: 'Macro',
    image: 'https://picsum.photos/400/200?random=3',
    resolutionSource: 'Federal Reserve'
  }
];

export const MOCK_USER_BALANCE = 5000; // Starting SOMI
