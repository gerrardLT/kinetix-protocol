// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KinetixVault
 * @dev Yield-generating vault for Kinetix Protocol
 * For MVP: Uses mock yield generation (simulated APY)
 */
contract KinetixVault is Pausable, Ownable, ReentrancyGuard {
    
    // ============ State Variables ============
    
    // Market contract address
    address public marketContract;
    
    // Current APY in basis points (e.g., 1250 = 12.50%)
    uint256 public currentAPY = 1250;
    
    // Total liquidity per market
    mapping(bytes32 => uint256) public marketLiquidity;
    
    // Yield generated per market
    mapping(bytes32 => uint256) public marketYield;
    
    // User deposits per market
    mapping(bytes32 => mapping(address => uint256)) public userDeposits;
    mapping(bytes32 => mapping(address => uint256)) public depositTimestamp;
    
    // Total deposits
    uint256 public totalDeposits;
    
    // ============ Events ============
    
    event Deposited(bytes32 indexed marketId, address indexed user, uint256 amount);
    event Withdrawn(bytes32 indexed marketId, address indexed to, uint256 amount);
    event YieldGenerated(bytes32 indexed marketId, uint256 amount, uint256 newAPY);
    event APYUpdated(uint256 newAPY);
    event MarketContractUpdated(address indexed newMarketContract);
    
    // ============ Modifiers ============
    
    modifier onlyMarket() {
        require(msg.sender == marketContract, "Only market contract");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // ============ Admin Functions ============
    
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    function setMarketContract(address _marketContract) external onlyOwner {
        marketContract = _marketContract;
        emit MarketContractUpdated(_marketContract);
    }
    
    function setAPY(uint256 _apy) external onlyOwner {
        require(_apy <= 10000, "APY too high"); // Max 100%
        currentAPY = _apy;
        emit APYUpdated(_apy);
    }

    
    // ============ Market Functions ============
    
    /**
     * @dev Deposit funds from market contract
     */
    function deposit(bytes32 marketId) external payable whenNotPaused {
        require(msg.value > 0, "Amount must be > 0");
        
        // For MVP: Accept deposits from anyone (in production: onlyMarket)
        marketLiquidity[marketId] += msg.value;
        userDeposits[marketId][tx.origin] += msg.value;
        depositTimestamp[marketId][tx.origin] = block.timestamp;
        totalDeposits += msg.value;
        
        emit Deposited(marketId, tx.origin, msg.value);
        
        // Simulate yield generation (MVP mock)
        _generateMockYield(marketId, msg.value);
    }
    
    /**
     * @dev Withdraw funds to user
     */
    function withdraw(bytes32 marketId, address to, uint256 amount) external nonReentrant {
        require(msg.sender == marketContract || msg.sender == owner(), "Not authorized");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(marketId, to, amount);
    }
    
    // ============ Mock Yield Functions (MVP) ============
    
    /**
     * @dev Generate mock yield for demonstration
     */
    function _generateMockYield(bytes32 marketId, uint256 depositAmount) internal {
        // Simulate instant yield generation for demo
        // In production: This would be replaced with actual DeFi protocol integration
        uint256 mockYield = (depositAmount * currentAPY) / 10000 / 365; // Daily yield
        marketYield[marketId] += mockYield;
        
        emit YieldGenerated(marketId, mockYield, currentAPY);
    }
    
    /**
     * @dev Admin function to add yield (for demo purposes)
     */
    function addYield(bytes32 marketId, uint256 amount) external onlyOwner {
        marketYield[marketId] += amount;
        emit YieldGenerated(marketId, amount, currentAPY);
    }
    
    // ============ View Functions ============
    
    function getTotalLiquidity(bytes32 marketId) external view returns (uint256) {
        return marketLiquidity[marketId];
    }
    
    function getYieldGenerated(bytes32 marketId) external view returns (uint256) {
        return marketYield[marketId];
    }
    
    function getCurrentAPY() external view returns (uint256) {
        return currentAPY;
    }
    
    /**
     * @dev Calculate user's yield share
     */
    function getUserYield(bytes32 marketId, address user) external view returns (uint256) {
        uint256 userDeposit = userDeposits[marketId][user];
        uint256 totalMarketDeposits = marketLiquidity[marketId];
        
        if (totalMarketDeposits == 0 || userDeposit == 0) return 0;
        
        // User's share of yield = (userDeposit / totalDeposits) * totalYield
        uint256 yieldShare = (userDeposit * marketYield[marketId]) / totalMarketDeposits;
        
        // Add time-based yield (mock)
        uint256 timeHeld = block.timestamp - depositTimestamp[marketId][user];
        uint256 timeYield = (userDeposit * currentAPY * timeHeld) / (10000 * 365 days);
        
        return yieldShare + timeYield;
    }
    
    /**
     * @dev Get claimable amount breakdown
     */
    function getClaimableAmount(bytes32 marketId, address user) external view returns (
        uint256 stake,
        uint256 winnings,
        uint256 yieldAmount,
        uint256 total
    ) {
        stake = userDeposits[marketId][user];
        yieldAmount = this.getUserYield(marketId, user);
        // Winnings calculated in Market contract
        winnings = 0;
        total = stake + yieldAmount;
    }
    
    // ============ Receive ============
    
    receive() external payable {
        totalDeposits += msg.value;
    }
}
