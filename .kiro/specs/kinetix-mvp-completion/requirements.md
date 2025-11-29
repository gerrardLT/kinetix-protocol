# Requirements Document

## Introduction

Kinetix Protocol is a yield-bearing prediction market on Somnia blockchain. This spec covers the completion of MVP features including real wallet connection, smart contract integration, Somnia Data Streams (SDS) integration, and market resolution/claim functionality. The current implementation has UI components ready but lacks blockchain integration.

## Glossary

- **Kinetix_System**: The Kinetix Protocol prediction market application
- **SOMI**: The native token used for betting on Somnia blockchain
- **SDS**: Somnia Data Streams - real-time blockchain data streaming service
- **Market**: A binary prediction market with YES/NO outcomes
- **Vault**: Smart contract that holds user funds and generates yield
- **Oracle**: External data source for market resolution
- **APY**: Annual Percentage Yield from DeFi protocols

## Requirements

### Requirement 1

**User Story:** As a user, I want to connect my Web3 wallet to the dApp, so that I can interact with the Somnia blockchain and place bets.

#### Acceptance Criteria

1. WHEN a user clicks the "Connect Wallet" button THEN the Kinetix_System SHALL display a wallet connection modal with MetaMask option
2. WHEN a user approves the wallet connection THEN the Kinetix_System SHALL display the user's truncated address and SOMI balance in the navbar
3. WHEN a user is connected to a wrong network THEN the Kinetix_System SHALL prompt the user to switch to Somnia Testnet
4. WHEN a user disconnects their wallet THEN the Kinetix_System SHALL reset the user state and hide wallet-specific UI elements

### Requirement 2

**User Story:** As a user, I want to place bets on prediction markets using SOMI tokens, so that I can speculate on event outcomes.

#### Acceptance Criteria

1. WHEN a user submits a bet with valid amount THEN the Kinetix_System SHALL call the smart contract to lock funds in the market vault
2. WHEN a bet transaction is pending THEN the Kinetix_System SHALL display a loading state and disable the submit button
3. WHEN a bet transaction succeeds THEN the Kinetix_System SHALL update the market pool sizes and user balance in real-time
4. WHEN a bet transaction fails THEN the Kinetix_System SHALL display an error message and restore the previous state
5. WHEN a user attempts to bet more than their balance THEN the Kinetix_System SHALL prevent submission and display insufficient balance warning

### Requirement 3

**User Story:** As a user, I want to see real-time updates of market data, so that I can make informed betting decisions.

#### Acceptance Criteria

1. WHEN new bets are placed on the blockchain THEN the Kinetix_System SHALL update pool sizes within 2 seconds via SDS
2. WHEN yield is generated in the vault THEN the Kinetix_System SHALL display updated APY and yield generated values in real-time
3. WHEN the SDS connection is lost THEN the Kinetix_System SHALL display a connection status indicator and attempt reconnection
4. WHEN the SDS connection is restored THEN the Kinetix_System SHALL sync the latest market state automatically

### Requirement 4

**User Story:** As a user, I want to claim my winnings after a market resolves, so that I can receive my payout plus accumulated yield.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the Kinetix_System SHALL display the outcome and enable claim button for winners
2. WHEN a winner clicks claim THEN the Kinetix_System SHALL call the smart contract to transfer winnings plus yield to user wallet
3. WHEN a claim transaction succeeds THEN the Kinetix_System SHALL update the bet status to "claimed" and refresh user balance
4. WHEN a user has no winning positions THEN the Kinetix_System SHALL display the loss status without claim option

### Requirement 5

**User Story:** As a developer, I want smart contracts to manage market funds and yield generation, so that the protocol operates trustlessly.

#### Acceptance Criteria

1. WHEN a user places a bet THEN the Vault_Contract SHALL lock the SOMI tokens and record the position
2. WHEN funds are deposited in the vault THEN the Vault_Contract SHALL route them to yield-generating protocol (mock for MVP)
3. WHEN a market is resolved THEN the Market_Contract SHALL calculate payouts based on pool ratios and accumulated yield
4. WHEN a winner claims THEN the Vault_Contract SHALL transfer original stake plus winnings plus yield share to the user address

### Requirement 6

**User Story:** As a user, I want to view my portfolio with accurate position values, so that I can track my investments and yields.

#### Acceptance Criteria

1. WHEN a user views portfolio THEN the Kinetix_System SHALL fetch all positions from the blockchain
2. WHEN yield accumulates THEN the Kinetix_System SHALL display real-time estimated yield for each position
3. WHEN a market resolves THEN the Kinetix_System SHALL update position status to show win/loss and claimable amount
