# Implementation Plan

- [x] 1. Set up Wagmi/Viem infrastructure




  - [x] 1.1 Install wagmi, viem, and @tanstack/react-query dependencies


    - Add wagmi v2, viem, @tanstack/react-query to package.json

    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Create Somnia Testnet chain configuration

    - Create `config/chains.ts` with Somnia Testnet (chainId: 50312, RPC: https://dream-rpc.somnia.network)
    - _Requirements: 1.3_
  - [x] 1.3 Create Wagmi config and provider setup

    - Create `config/wagmi.ts` with MetaMask connector
    - Wrap App with WagmiProvider and QueryClientProvider in `index.tsx`
    - _Requirements: 1.1, 1.2_
  - [ ]* 1.4 Write property test for network validation
    - **Property 2: Network Validation**
    - **Validates: Requirements 1.3**

- [x] 2. Implement wallet connection hooks


  - [x] 2.1 Create useWallet hook


    - Create `hooks/useWallet.ts` with connect, disconnect, switchNetwork functions
    - Use wagmi's useAccount, useConnect, useDisconnect, useSwitchChain hooks
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 Update Navbar component to use real wallet connection


    - Replace mock handleConnect with useWallet hook
    - Display real address and balance from chain
    - Add network switch prompt when on wrong network
    - _Requirements: 1.2, 1.3_
  - [ ]* 2.3 Write property test for disconnect state reset
    - **Property 3: Disconnect State Reset**
    - **Validates: Requirements 1.4**

- [x] 3. Create smart contract ABIs and hooks


  - [x] 3.1 Create contract ABI files


    - Create `contracts/MarketABI.ts` with market contract interface
    - Create `contracts/VaultABI.ts` with vault contract interface
    - Create `contracts/addresses.ts` with deployed contract addresses
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.2 Create useMarketContract hook


    - Create `hooks/useMarketContract.ts` for reading market data
    - Implement getMarket, getUserPosition, getMarketOdds functions
    - _Requirements: 2.1, 4.1_

  - [x] 3.3 Create useVaultContract hook

    - Create `hooks/useVaultContract.ts` for vault interactions
    - Implement getTotalLiquidity, getYieldGenerated, getCurrentAPY functions
    - _Requirements: 2.3, 6.2_

- [x] 4. Implement betting functionality



  - [x] 4.1 Create usePlaceBet hook

    - Create `hooks/usePlaceBet.ts` with transaction handling
    - Handle pending, success, and error states
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 4.2 Update MarketCard component for real betting


    - Integrate usePlaceBet hook
    - Add loading state during transaction
    - Show transaction status feedback
    - _Requirements: 2.1, 2.2_
  - [x] 4.3 Update MarketDetail component for real betting


    - Integrate usePlaceBet hook
    - Update pool sizes after successful bet
    - Handle transaction errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 4.4 Write property test for balance validation
    - **Property 7: Balance Validation**
    - **Validates: Requirements 2.5**
  - [ ]* 4.5 Write property test for pool update after bet
    - **Property 5: Pool Update After Bet**
    - **Validates: Requirements 2.3**

- [x] 5. Checkpoint - Ensure wallet and betting work

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement claim functionality



  - [x] 6.1 Create useClaim hook

    - Create `hooks/useClaim.ts` for claiming winnings
    - Calculate payout amount (stake + winnings + yield)
    - Handle transaction states
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.2 Update Portfolio component with claim button


    - Show claim button for winning positions on resolved markets
    - Display claimable amount including yield
    - Update position status after successful claim
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.3 Write property test for winner claim eligibility
    - **Property 8: Winner Claim Eligibility**
    - **Validates: Requirements 4.1**
  - [ ]* 6.4 Write property test for payout calculation
    - **Property 12: Payout Calculation**

    - **Validates: Requirements 5.3, 5.4**






- [x] 7. Implement Somnia Data Streams (SDS) integration

  - [x] 7.1 Create SDS service


    - Create `services/sdsService.ts` for WebSocket connection
    - Implement connect, disconnect, subscribe, unsubscribe methods
    - Handle reconnection logic



    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 7.2 Create useSDS hook


    - Create `hooks/useSDS.ts` for React integration




    - Manage connection state and subscriptions
    - Provide real-time market updates to components




    - _Requirements: 3.1, 3.2_

  - [x] 7.3 Update LiveTicker with real SDS data


    - Replace mock interval with SDS subscription
    - Display real blockchain events

    - Show connection status indicator

    - _Requirements: 3.1, 3.3_
  - [x] 7.4 Update App.tsx to use SDS for market updates


    - Replace mock setInterval with SDS subscriptions
    - Update markets state from real-time data

    - _Requirements: 3.1, 3.2_






- [x] 8. Update state management for on-chain data


  - [x] 8.1 Create useUserPositions hook


    - Create `hooks/useUserPositions.ts` to fetch positions from contract


    - Calculate estimated yield for each position
    - _Requirements: 6.1, 6.2_
  - [x] 8.2 Update Portfolio to fetch real positions


    - Replace mock bets with on-chain positions
    - Display real yield and payout estimates
    - Show win/loss status for resolved markets

    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 8.3 Write property test for yield calculation
    - **Property 13: Yield Display Calculation**
    - **Validates: Requirements 6.2**
  - [ ]* 8.4 Write property test for position win/loss status
    - **Property 14: Position Win/Loss Status**
    - **Validates: Requirements 6.3**


- [x] 9. Final integration and cleanup

  - [x] 9.1 Update App.tsx with complete integration
    - Remove all mock data and intervals
    - Use real contract data for markets
    - Integrate all hooks properly
    - _Requirements: All_

  - [x] 9.2 Add error boundaries and loading states
    - Add React error boundaries for graceful error handling
    - Add skeleton loaders for async data
    - _Requirements: 2.4, 3.3_
  - [x] 9.3 Update types.ts with blockchain types
    - Add Address type from viem


    - Update Market and Bet interfaces for bigint
    - Add transaction status types
    - _Requirements: All_

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
