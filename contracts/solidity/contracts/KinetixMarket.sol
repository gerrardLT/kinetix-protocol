// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KinetixMarket
 * @dev Yield-bearing prediction market contract for Kinetix Protocol on Somnia
 */
contract KinetixMarket is Pausable, Ownable, ReentrancyGuard {
    
    // ============ Enums ============
    enum MarketStatus { Active, Resolved, Paused }
    
    // ============ Structs ============
    struct Market {
        string question;
        string description;
        uint256 poolYes;
        uint256 poolNo;
        uint256 endTime;
        MarketStatus status;
        bool outcome; // true = YES won, false = NO won
        address oracle;
    }
    
    struct Position {
        uint256 amount;
        bool outcome; // true = YES, false = NO
        uint256 timestamp;
        bool claimed;
    }
    
    // ============ State Variables ============
    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => mapping(address => Position)) public positions;
    mapping(address => bytes32[]) public userMarkets;
    bytes32[] public allMarketIds;
    
    // Vault for yield generation
    address public vault;
    
    // ============ Events ============
    event MarketCreated(bytes32 indexed marketId, string question, uint256 endTime);
    event BetPlaced(bytes32 indexed marketId, address indexed user, bool outcome, uint256 amount);
    event MarketResolved(bytes32 indexed marketId, bool outcome);
    event WinningsClaimed(bytes32 indexed marketId, address indexed user, uint256 payout);
    event VaultUpdated(address indexed newVault);
    
    // ============ Constructor ============
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // ============ Admin Functions ============

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultUpdated(_vault);
    }
    
    /**
     * @dev Create a new prediction market
     */
    function createMarket(
        bytes32 marketId,
        string calldata question,
        string calldata description,
        uint256 endTime,
        address oracle
    ) external onlyOwner {
        require(markets[marketId].endTime == 0, "Market already exists");
        require(endTime > block.timestamp, "End time must be in future");
        
        markets[marketId] = Market({
            question: question,
            description: description,
            poolYes: 0,
            poolNo: 0,
            endTime: endTime,
            status: MarketStatus.Active,
            outcome: false,
            oracle: oracle
        });
        
        allMarketIds.push(marketId);
        emit MarketCreated(marketId, question, endTime);
    }
    
    /**
     * @dev Resolve a market with the final outcome
     */
    function resolveMarket(bytes32 marketId, bool outcome) external {
        Market storage market = markets[marketId];
        require(market.endTime > 0, "Market does not exist");
        require(market.status == MarketStatus.Active, "Market not active");
        require(
            msg.sender == market.oracle || msg.sender == owner(),
            "Only oracle or owner can resolve"
        );
        
        market.status = MarketStatus.Resolved;
        market.outcome = outcome;
        
        emit MarketResolved(marketId, outcome);
    }
    
    // ============ User Functions ============
    
    /**
     * @dev Place a bet on a market outcome
     */
    function placeBet(bytes32 marketId, bool outcome) external payable whenNotPaused nonReentrant {
        Market storage market = markets[marketId];
        require(market.endTime > 0, "Market does not exist");
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp < market.endTime, "Market has ended");
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(positions[marketId][msg.sender].amount == 0, "Already has position");
        
        // Record position
        positions[marketId][msg.sender] = Position({
            amount: msg.value,
            outcome: outcome,
            timestamp: block.timestamp,
            claimed: false
        });
        
        // Update pool
        if (outcome) {
            market.poolYes += msg.value;
        } else {
            market.poolNo += msg.value;
        }
        
        // Track user's markets
        userMarkets[msg.sender].push(marketId);
        
        // Forward funds to vault for yield generation
        if (vault != address(0)) {
            (bool success, ) = vault.call{value: msg.value}(
                abi.encodeWithSignature("deposit(bytes32)", marketId)
            );
            require(success, "Vault deposit failed");
        }
        
        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    
    /**
     * @dev Claim winnings from a resolved market
     */
    function claimWinnings(bytes32 marketId) external nonReentrant returns (uint256 payout) {
        Market storage market = markets[marketId];
        Position storage position = positions[marketId][msg.sender];
        
        require(market.status == MarketStatus.Resolved, "Market not resolved");
        require(position.amount > 0, "No position");
        require(!position.claimed, "Already claimed");
        require(position.outcome == market.outcome, "Not a winner");
        
        // Calculate payout
        uint256 winningPool = market.outcome ? market.poolYes : market.poolNo;
        uint256 losingPool = market.outcome ? market.poolNo : market.poolYes;
        
        // Payout = stake + (stake/winningPool * losingPool)
        uint256 winnings = (position.amount * losingPool) / winningPool;
        payout = position.amount + winnings;
        
        // Add yield if vault exists
        if (vault != address(0)) {
            try IKinetixVault(vault).getUserYield(marketId, msg.sender) returns (uint256 yieldAmount) {
                payout += yieldAmount;
            } catch {}
        }
        
        position.claimed = true;
        
        // Transfer payout
        if (vault != address(0)) {
            IKinetixVault(vault).withdraw(marketId, msg.sender, payout);
        } else {
            (bool success, ) = msg.sender.call{value: payout}("");
            require(success, "Transfer failed");
        }
        
        emit WinningsClaimed(marketId, msg.sender, payout);
    }
    
    // ============ View Functions ============
    
    function getMarket(bytes32 marketId) external view returns (
        string memory question,
        string memory description,
        uint256 poolYes,
        uint256 poolNo,
        uint256 endTime,
        MarketStatus status,
        bool outcome,
        address oracle
    ) {
        Market storage m = markets[marketId];
        return (m.question, m.description, m.poolYes, m.poolNo, m.endTime, m.status, m.outcome, m.oracle);
    }
    
    function getUserPosition(bytes32 marketId, address user) external view returns (
        uint256 amount,
        bool outcome,
        uint256 timestamp,
        bool claimed
    ) {
        Position storage p = positions[marketId][user];
        return (p.amount, p.outcome, p.timestamp, p.claimed);
    }
    
    function getMarketOdds(bytes32 marketId) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market storage m = markets[marketId];
        uint256 total = m.poolYes + m.poolNo;
        if (total == 0) return (50, 50);
        yesOdds = (m.poolYes * 100) / total;
        noOdds = (m.poolNo * 100) / total;
    }
    
    function getAllMarkets() external view returns (bytes32[] memory) {
        return allMarketIds;
    }
    
    function getUserPositions(address user) external view returns (bytes32[] memory) {
        return userMarkets[user];
    }
    
    // ============ Receive ============
    receive() external payable {}
}

// Interface for Vault
interface IKinetixVault {
    function deposit(bytes32 marketId) external payable;
    function withdraw(bytes32 marketId, address to, uint256 amount) external;
    function getUserYield(bytes32 marketId, address user) external view returns (uint256);
}
