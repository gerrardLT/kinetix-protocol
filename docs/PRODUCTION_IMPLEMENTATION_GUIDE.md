# Kinetix Protocol 生产环境实现指南

本文档详细说明如何将 Kinetix Protocol 从 MVP 升级到生产环境，包括四个核心功能的实现。

---

## 目录

1. [接入真实的 Somnia Data Streams SDK](#1-接入真实的-somnia-data-streams-sdk)
2. [将 Vault 接入真实的 DeFi 协议](#2-将-vault-接入真实的-defi-协议)
3. [集成 Oracle 进行市场解决](#3-集成-oracle-进行市场解决)
4. [添加真实的历史数据存储和查询](#4-添加真实的历史数据存储和查询)

---

## 1. 接入真实的 Somnia Data Streams SDK

### 1.1 概述

Somnia Data Streams (SDS) 是 Somnia 区块链的实时数据流服务，提供低延迟的链上事件订阅。

### 1.2 前置条件

- Somnia Testnet/Mainnet 访问权限
- SDS SDK 或 WebSocket 端点
- API Key (如果需要)

### 1.3 实现步骤

#### 步骤 1: 安装 SDS SDK

```bash
# 如果 Somnia 提供官方 SDK
npm install @somnia/data-streams-sdk

# 或者使用通用 WebSocket 库
npm install ws reconnecting-websocket
```


#### 步骤 2: 创建真实的 SDS Service

替换 `services/sdsService.ts`:

```typescript
/**
 * Somnia Data Streams (SDS) Service - Production Implementation
 * 
 * 连接到真实的 Somnia Data Streams WebSocket 端点
 */

import ReconnectingWebSocket from 'reconnecting-websocket';

// SDS 配置
const SDS_CONFIG = {
  // Somnia 官方 WebSocket 端点
  wsEndpoint: 'wss://sds.somnia.network/ws',
  // 或者使用 RPC 订阅
  rpcEndpoint: 'wss://dream-rpc.somnia.network/ws',
  // API Key (如果需要)
  apiKey: process.env.VITE_SDS_API_KEY,
};

// 事件类型
export interface ContractEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface BlockHeader {
  number: number;
  hash: string;
  timestamp: number;
  parentHash: string;
}

class SDSServiceProduction {
  private ws: ReconnectingWebSocket | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected: boolean = false;
  private requestId: number = 1;
  private pendingRequests: Map<number, (result: any) => void> = new Map();

  /**
   * 连接到 SDS WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new ReconnectingWebSocket(SDS_CONFIG.wsEndpoint, [], {
          maxRetries: 10,
          connectionTimeout: 5000,
        });

        this.ws.onopen = () => {
          console.log('[SDS] Connected to Somnia Data Streams');
          this.isConnected = true;
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error('[SDS] WebSocket error:', error);
        };

        this.ws.onclose = () => {
          console.log('[SDS] Disconnected');
          this.isConnected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 订阅合约事件 (如 BetPlaced, MarketResolved)
   */
  subscribeToContractEvents(
    contractAddress: string,
    eventSignature: string,
    callback: (event: ContractEvent) => void
  ): () => void {
    const subscriptionKey = `logs:${contractAddress}:${eventSignature}`;
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
      
      // 发送订阅请求
      this.sendSubscription('eth_subscribe', [
        'logs',
        {
          address: contractAddress,
          topics: [eventSignature],
        },
      ]);
    }

    this.subscriptions.get(subscriptionKey)!.add(callback);

    return () => {
      this.subscriptions.get(subscriptionKey)?.delete(callback);
    };
  }

  /**
   * 订阅新区块
   */
  subscribeToNewBlocks(callback: (block: BlockHeader) => void): () => void {
    const subscriptionKey = 'newHeads';
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
      this.sendSubscription('eth_subscribe', ['newHeads']);
    }

    this.subscriptions.get(subscriptionKey)!.add(callback);

    return () => {
      this.subscriptions.get(subscriptionKey)?.delete(callback);
    };
  }

  /**
   * 订阅待处理交易
   */
  subscribeToPendingTransactions(callback: (txHash: string) => void): () => void {
    const subscriptionKey = 'pendingTransactions';
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
      this.sendSubscription('eth_subscribe', ['newPendingTransactions']);
    }

    this.subscriptions.get(subscriptionKey)!.add(callback);

    return () => {
      this.subscriptions.get(subscriptionKey)?.delete(callback);
    };
  }

  private sendSubscription(method: string, params: any[]): void {
    if (!this.ws || !this.isConnected) return;

    const id = this.requestId++;
    this.ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }));
  }

  private handleMessage(message: any): void {
    // 处理订阅响应
    if (message.id && this.pendingRequests.has(message.id)) {
      this.pendingRequests.get(message.id)!(message.result);
      this.pendingRequests.delete(message.id);
      return;
    }

    // 处理订阅事件
    if (message.method === 'eth_subscription') {
      const { subscription, result } = message.params;
      this.notifySubscribers(subscription, result);
    }
  }

  private notifySubscribers(subscriptionId: string, data: any): void {
    // 根据数据类型分发到对应的订阅者
    this.subscriptions.forEach((callbacks, key) => {
      if (this.matchesSubscription(key, data)) {
        callbacks.forEach(cb => cb(data));
      }
    });
  }

  private matchesSubscription(key: string, data: any): boolean {
    if (key === 'newHeads' && data.number) return true;
    if (key === 'pendingTransactions' && typeof data === 'string') return true;
    if (key.startsWith('logs:') && data.address) {
      const [, address] = key.split(':');
      return data.address.toLowerCase() === address.toLowerCase();
    }
    return false;
  }

  private resubscribeAll(): void {
    // 重连后重新订阅所有事件
    this.subscriptions.forEach((_, key) => {
      if (key === 'newHeads') {
        this.sendSubscription('eth_subscribe', ['newHeads']);
      } else if (key === 'pendingTransactions') {
        this.sendSubscription('eth_subscribe', ['newPendingTransactions']);
      } else if (key.startsWith('logs:')) {
        const [, address, topic] = key.split(':');
        this.sendSubscription('eth_subscribe', [
          'logs',
          { address, topics: [topic] },
        ]);
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const sdsService = new SDSServiceProduction();
```


#### 步骤 3: 更新 Hook 使用真实事件

更新 `hooks/useSDS.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { sdsService } from '../services/sdsService';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { parseAbiItem, decodeEventLog } from 'viem';
import { MarketABI } from '../contracts/MarketABI';

// 事件签名 (keccak256 hash)
const EVENT_SIGNATURES = {
  BetPlaced: '0x...', // keccak256("BetPlaced(bytes32,address,bool,uint256)")
  MarketResolved: '0x...', // keccak256("MarketResolved(bytes32,bool)")
  WinningsClaimed: '0x...', // keccak256("WinningsClaimed(bytes32,address,uint256)")
};

export function useRealTimeBets(onBet: (event: DecodedBetEvent) => void) {
  useEffect(() => {
    const unsubscribe = sdsService.subscribeToContractEvents(
      CONTRACT_ADDRESSES.MARKET,
      EVENT_SIGNATURES.BetPlaced,
      (rawEvent) => {
        // 解码事件数据
        const decoded = decodeEventLog({
          abi: MarketABI,
          eventName: 'BetPlaced',
          data: rawEvent.data,
          topics: rawEvent.topics as [`0x${string}`, ...`0x${string}`[]],
        });

        onBet({
          marketId: decoded.args.marketId,
          user: decoded.args.user,
          outcome: decoded.args.outcome,
          amount: decoded.args.amount,
          blockNumber: rawEvent.blockNumber,
          txHash: rawEvent.transactionHash,
        });
      }
    );

    return unsubscribe;
  }, [onBet]);
}

export function useRealTimeBlocks() {
  const [blockNumber, setBlockNumber] = useState<number>(0);

  useEffect(() => {
    sdsService.connect();

    const unsubscribe = sdsService.subscribeToNewBlocks((block) => {
      setBlockNumber(block.number);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return blockNumber;
}
```

#### 步骤 4: 配置环境变量

在 `.env.local` 中添加:

```env
VITE_SDS_WS_ENDPOINT=wss://sds.somnia.network/ws
VITE_SDS_API_KEY=your_api_key_here
```

---

## 2. 将 Vault 接入真实的 DeFi 协议

### 2.1 概述

将 Mock Yield 替换为真实的 DeFi 协议集成，如 Somnia 原生的 Staking 或 Lending 协议。

### 2.2 架构设计

```
用户下注 → KinetixMarket → KinetixVault → DeFi Protocol (Staking/Lending)
                                    ↓
                              收益累积
                                    ↓
用户领取 ← KinetixMarket ← KinetixVault ← 提取本金+收益
```

### 2.3 实现步骤

#### 步骤 1: 创建 DeFi 适配器接口

创建 `contracts/solidity/contracts/interfaces/IYieldStrategy.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IYieldStrategy
 * @dev 收益策略接口，用于集成不同的 DeFi 协议
 */
interface IYieldStrategy {
    /// @notice 存入资金到 DeFi 协议
    /// @param amount 存入金额
    /// @return shares 获得的份额
    function deposit(uint256 amount) external payable returns (uint256 shares);
    
    /// @notice 从 DeFi 协议提取资金
    /// @param shares 要赎回的份额
    /// @return amount 提取的金额
    function withdraw(uint256 shares) external returns (uint256 amount);
    
    /// @notice 获取当前总资产价值
    /// @return 总资产 (本金 + 收益)
    function totalAssets() external view returns (uint256);
    
    /// @notice 获取当前 APY (基点)
    /// @return APY in basis points (e.g., 1250 = 12.50%)
    function getCurrentAPY() external view returns (uint256);
    
    /// @notice 获取用户的份额
    /// @param user 用户地址
    /// @return 用户份额
    function balanceOf(address user) external view returns (uint256);
    
    /// @notice 将份额转换为资产
    /// @param shares 份额数量
    /// @return 对应的资产数量
    function convertToAssets(uint256 shares) external view returns (uint256);
}
```


#### 步骤 2: 实现 Staking 策略适配器

创建 `contracts/solidity/contracts/strategies/SomniaStakingStrategy.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IYieldStrategy.sol";

// Somnia 原生 Staking 合约接口 (假设)
interface ISomniaStaking {
    function stake() external payable;
    function unstake(uint256 amount) external;
    function getStakedBalance(address user) external view returns (uint256);
    function getRewards(address user) external view returns (uint256);
    function claimRewards() external;
    function getCurrentAPR() external view returns (uint256);
}

/**
 * @title SomniaStakingStrategy
 * @dev 将资金存入 Somnia 原生 Staking 协议
 */
contract SomniaStakingStrategy is IYieldStrategy, Ownable, ReentrancyGuard {
    
    ISomniaStaking public immutable stakingContract;
    
    // 用户份额追踪
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    // 授权的 Vault 地址
    address public vault;
    
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    
    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }
    
    constructor(
        address _stakingContract,
        address _owner
    ) Ownable(_owner) {
        stakingContract = ISomniaStaking(_stakingContract);
    }
    
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }
    
    /**
     * @dev 存入资金到 Staking 协议
     */
    function deposit(uint256 amount) external payable onlyVault nonReentrant returns (uint256 shares) {
        require(msg.value == amount && amount > 0, "Invalid amount");
        
        // 计算份额
        uint256 totalAssetsBefore = totalAssets();
        if (totalShares == 0 || totalAssetsBefore == 0) {
            shares = amount;
        } else {
            shares = (amount * totalShares) / totalAssetsBefore;
        }
        
        // 存入 Staking 协议
        stakingContract.stake{value: amount}();
        
        // 更新份额
        userShares[tx.origin] += shares;
        totalShares += shares;
        
        emit Deposited(tx.origin, amount, shares);
    }
    
    /**
     * @dev 从 Staking 协议提取资金
     */
    function withdraw(uint256 shares) external onlyVault nonReentrant returns (uint256 amount) {
        require(shares > 0 && shares <= userShares[tx.origin], "Invalid shares");
        
        // 计算可提取金额
        amount = convertToAssets(shares);
        
        // 先领取奖励
        stakingContract.claimRewards();
        
        // 从 Staking 协议提取
        stakingContract.unstake(amount);
        
        // 更新份额
        userShares[tx.origin] -= shares;
        totalShares -= shares;
        
        // 转账给 Vault
        (bool success, ) = vault.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(tx.origin, shares, amount);
    }
    
    /**
     * @dev 获取总资产 (本金 + 收益)
     */
    function totalAssets() public view returns (uint256) {
        return stakingContract.getStakedBalance(address(this)) + 
               stakingContract.getRewards(address(this));
    }
    
    /**
     * @dev 获取当前 APY
     */
    function getCurrentAPY() external view returns (uint256) {
        return stakingContract.getCurrentAPR();
    }
    
    /**
     * @dev 获取用户份额
     */
    function balanceOf(address user) external view returns (uint256) {
        return userShares[user];
    }
    
    /**
     * @dev 份额转资产
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalAssets()) / totalShares;
    }
    
    receive() external payable {}
}
```


#### 步骤 3: 升级 KinetixVault 合约

创建 `contracts/solidity/contracts/KinetixVaultV2.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IYieldStrategy.sol";

/**
 * @title KinetixVaultV2
 * @dev 生产版本 - 集成真实 DeFi 协议
 */
contract KinetixVaultV2 is Pausable, Ownable, ReentrancyGuard {
    
    // ============ State Variables ============
    
    address public marketContract;
    IYieldStrategy public yieldStrategy;
    
    // 每个市场的存款追踪
    mapping(bytes32 => uint256) public marketDeposits;
    mapping(bytes32 => uint256) public marketShares;
    
    // 用户在每个市场的份额
    mapping(bytes32 => mapping(address => uint256)) public userShares;
    mapping(bytes32 => mapping(address => uint256)) public userDeposits;
    
    uint256 public totalDeposits;
    
    // ============ Events ============
    
    event Deposited(bytes32 indexed marketId, address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(bytes32 indexed marketId, address indexed to, uint256 amount);
    event StrategyUpdated(address indexed newStrategy);
    
    // ============ Constructor ============
    
    constructor(address initialOwner, address _strategy) Ownable(initialOwner) {
        yieldStrategy = IYieldStrategy(_strategy);
    }
    
    // ============ Admin Functions ============
    
    function setMarketContract(address _marketContract) external onlyOwner {
        marketContract = _marketContract;
    }
    
    function setStrategy(address _strategy) external onlyOwner {
        yieldStrategy = IYieldStrategy(_strategy);
        emit StrategyUpdated(_strategy);
    }
    
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev 存入资金到 DeFi 策略
     */
    function deposit(bytes32 marketId) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        // 存入策略并获取份额
        uint256 shares = yieldStrategy.deposit{value: msg.value}(msg.value);
        
        // 记录用户和市场的份额
        userShares[marketId][tx.origin] += shares;
        userDeposits[marketId][tx.origin] += msg.value;
        marketShares[marketId] += shares;
        marketDeposits[marketId] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposited(marketId, tx.origin, msg.value, shares);
    }
    
    /**
     * @dev 提取资金 (包含收益)
     */
    function withdraw(bytes32 marketId, address to, uint256 requestedAmount) external nonReentrant {
        require(msg.sender == marketContract || msg.sender == owner(), "Not authorized");
        
        uint256 userShareBalance = userShares[marketId][to];
        require(userShareBalance > 0, "No shares");
        
        // 计算用户可提取的总资产 (本金 + 收益)
        uint256 totalUserAssets = yieldStrategy.convertToAssets(userShareBalance);
        uint256 amountToWithdraw = requestedAmount > totalUserAssets ? totalUserAssets : requestedAmount;
        
        // 计算需要赎回的份额
        uint256 sharesToRedeem = (userShareBalance * amountToWithdraw) / totalUserAssets;
        
        // 从策略提取
        uint256 actualAmount = yieldStrategy.withdraw(sharesToRedeem);
        
        // 更新状态
        userShares[marketId][to] -= sharesToRedeem;
        marketShares[marketId] -= sharesToRedeem;
        
        // 转账给用户
        (bool success, ) = to.call{value: actualAmount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(marketId, to, actualAmount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev 获取用户在某市场的总资产 (本金 + 收益)
     */
    function getUserAssets(bytes32 marketId, address user) external view returns (uint256) {
        uint256 shares = userShares[marketId][user];
        if (shares == 0) return 0;
        return yieldStrategy.convertToAssets(shares);
    }
    
    /**
     * @dev 获取用户收益
     */
    function getUserYield(bytes32 marketId, address user) external view returns (uint256) {
        uint256 shares = userShares[marketId][user];
        if (shares == 0) return 0;
        
        uint256 currentValue = yieldStrategy.convertToAssets(shares);
        uint256 originalDeposit = userDeposits[marketId][user];
        
        return currentValue > originalDeposit ? currentValue - originalDeposit : 0;
    }
    
    /**
     * @dev 获取当前 APY
     */
    function getCurrentAPY() external view returns (uint256) {
        return yieldStrategy.getCurrentAPY();
    }
    
    /**
     * @dev 获取市场总流动性
     */
    function getTotalLiquidity(bytes32 marketId) external view returns (uint256) {
        uint256 shares = marketShares[marketId];
        if (shares == 0) return 0;
        return yieldStrategy.convertToAssets(shares);
    }
    
    receive() external payable {}
}
```


#### 步骤 4: 部署脚本

更新 `contracts/solidity/scripts/deployV2.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. 部署策略合约 (假设 Somnia Staking 地址已知)
  const SOMNIA_STAKING_ADDRESS = "0x..."; // Somnia 原生 Staking 合约地址
  
  const Strategy = await ethers.getContractFactory("SomniaStakingStrategy");
  const strategy = await Strategy.deploy(SOMNIA_STAKING_ADDRESS, deployer.address);
  await strategy.waitForDeployment();
  console.log("Strategy deployed to:", await strategy.getAddress());

  // 2. 部署 Vault V2
  const VaultV2 = await ethers.getContractFactory("KinetixVaultV2");
  const vault = await VaultV2.deploy(deployer.address, await strategy.getAddress());
  await vault.waitForDeployment();
  console.log("VaultV2 deployed to:", await vault.getAddress());

  // 3. 设置策略的 Vault 地址
  await strategy.setVault(await vault.getAddress());
  console.log("Strategy vault set");

  // 4. 部署 Market 合约 (如果需要升级)
  const Market = await ethers.getContractFactory("KinetixMarket");
  const market = await Market.deploy(deployer.address);
  await market.waitForDeployment();
  console.log("Market deployed to:", await market.getAddress());

  // 5. 关联 Market 和 Vault
  await market.setVault(await vault.getAddress());
  await vault.setMarketContract(await market.getAddress());
  console.log("Contracts linked");

  // 6. 创建市场
  const markets = [
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("btc-100k-2025")),
      question: "Will Bitcoin break $100k by Q4 2025?",
      description: "Based on BTC/USD price on major exchanges",
      endTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    },
    // ... 更多市场
  ];

  for (const m of markets) {
    await market.createMarket(
      m.id,
      m.question,
      m.description,
      m.endTime,
      deployer.address // Oracle 地址
    );
    console.log(`Market created: ${m.question}`);
  }
}

main().catch(console.error);
```

---

## 3. 集成 Oracle 进行市场解决

### 3.1 概述

使用 Chainlink 或其他 Oracle 服务自动解决预测市场。

### 3.2 方案选择

| 方案 | 优点 | 缺点 |
|------|------|------|
| Chainlink Price Feeds | 成熟、可靠 | 需要 LINK 代币 |
| Chainlink Functions | 灵活、可自定义 | 复杂度高 |
| UMA Optimistic Oracle | 去中心化 | 解决时间长 |
| API3 | 第一方数据 | 生态较小 |
| 自建 Oracle | 完全控制 | 中心化风险 |

### 3.3 实现步骤 (Chainlink Price Feeds)

#### 步骤 1: 创建 Oracle 解决器合约

创建 `contracts/solidity/contracts/oracles/ChainlinkResolver.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IKinetixMarket {
    function resolveMarket(bytes32 marketId, bool outcome) external;
}

/**
 * @title ChainlinkResolver
 * @dev 使用 Chainlink Price Feeds 自动解决价格相关的预测市场
 */
contract ChainlinkResolver is Ownable {
    
    // ============ Structs ============
    
    struct PriceCondition {
        address priceFeed;      // Chainlink Price Feed 地址
        int256 targetPrice;     // 目标价格 (8 decimals)
        bool isAbove;           // true = 价格需要高于目标, false = 低于
        uint256 resolutionTime; // 解决时间
        bool resolved;          // 是否已解决
    }
    
    // ============ State Variables ============
    
    IKinetixMarket public marketContract;
    mapping(bytes32 => PriceCondition) public conditions;
    
    // ============ Events ============
    
    event ConditionSet(bytes32 indexed marketId, address priceFeed, int256 targetPrice, bool isAbove);
    event MarketResolved(bytes32 indexed marketId, bool outcome, int256 actualPrice);
    
    // ============ Constructor ============
    
    constructor(address _marketContract, address _owner) Ownable(_owner) {
        marketContract = IKinetixMarket(_marketContract);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev 设置市场的价格条件
     */
    function setCondition(
        bytes32 marketId,
        address priceFeed,
        int256 targetPrice,
        bool isAbove,
        uint256 resolutionTime
    ) external onlyOwner {
        conditions[marketId] = PriceCondition({
            priceFeed: priceFeed,
            targetPrice: targetPrice,
            isAbove: isAbove,
            resolutionTime: resolutionTime,
            resolved: false
        });
        
        emit ConditionSet(marketId, priceFeed, targetPrice, isAbove);
    }
    
    /**
     * @dev 解决市场 (任何人都可以调用，但需要满足时间条件)
     */
    function resolveMarket(bytes32 marketId) external {
        PriceCondition storage condition = conditions[marketId];
        
        require(condition.priceFeed != address(0), "Condition not set");
        require(!condition.resolved, "Already resolved");
        require(block.timestamp >= condition.resolutionTime, "Too early");
        
        // 获取当前价格
        AggregatorV3Interface priceFeed = AggregatorV3Interface(condition.priceFeed);
        (, int256 price, , , ) = priceFeed.latestRoundData();
        
        // 判断结果
        bool outcome;
        if (condition.isAbove) {
            outcome = price >= condition.targetPrice;
        } else {
            outcome = price <= condition.targetPrice;
        }
        
        // 标记已解决
        condition.resolved = true;
        
        // 调用 Market 合约解决
        marketContract.resolveMarket(marketId, outcome);
        
        emit MarketResolved(marketId, outcome, price);
    }
    
    /**
     * @dev 批量解决多个市场
     */
    function resolveMultiple(bytes32[] calldata marketIds) external {
        for (uint i = 0; i < marketIds.length; i++) {
            try this.resolveMarket(marketIds[i]) {} catch {}
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @dev 获取当前价格
     */
    function getCurrentPrice(bytes32 marketId) external view returns (int256) {
        PriceCondition storage condition = conditions[marketId];
        require(condition.priceFeed != address(0), "Condition not set");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(condition.priceFeed);
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }
    
    /**
     * @dev 检查市场是否可以解决
     */
    function canResolve(bytes32 marketId) external view returns (bool) {
        PriceCondition storage condition = conditions[marketId];
        return condition.priceFeed != address(0) && 
               !condition.resolved && 
               block.timestamp >= condition.resolutionTime;
    }
}
```


#### 步骤 2: 创建通用事件 Oracle (使用 Chainlink Functions)

创建 `contracts/solidity/contracts/oracles/ChainlinkFunctionsResolver.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IKinetixMarket {
    function resolveMarket(bytes32 marketId, bool outcome) external;
}

/**
 * @title ChainlinkFunctionsResolver
 * @dev 使用 Chainlink Functions 解决任意类型的预测市场
 * 可以调用外部 API 获取结果
 */
contract ChainlinkFunctionsResolver is FunctionsClient, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;
    
    // ============ State Variables ============
    
    IKinetixMarket public marketContract;
    
    // Chainlink Functions 配置
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    
    // 请求追踪
    mapping(bytes32 => bytes32) public requestToMarket; // requestId => marketId
    mapping(bytes32 => string) public marketSources;    // marketId => JavaScript source
    
    // ============ Events ============
    
    event ResolutionRequested(bytes32 indexed marketId, bytes32 indexed requestId);
    event ResolutionFulfilled(bytes32 indexed marketId, bool outcome);
    event ResolutionFailed(bytes32 indexed marketId, bytes error);
    
    // ============ Constructor ============
    
    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId,
        address _marketContract,
        address _owner
    ) FunctionsClient(router) Ownable(_owner) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        marketContract = IKinetixMarket(_marketContract);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev 设置市场的解决脚本
     * @param marketId 市场 ID
     * @param source JavaScript 代码，返回 "true" 或 "false"
     */
    function setMarketSource(bytes32 marketId, string calldata source) external onlyOwner {
        marketSources[marketId] = source;
    }
    
    /**
     * @dev 请求解决市场
     */
    function requestResolution(bytes32 marketId) external returns (bytes32 requestId) {
        string memory source = marketSources[marketId];
        require(bytes(source).length > 0, "Source not set");
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        requestToMarket[requestId] = marketId;
        emit ResolutionRequested(marketId, requestId);
    }
    
    /**
     * @dev Chainlink Functions 回调
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        bytes32 marketId = requestToMarket[requestId];
        require(marketId != bytes32(0), "Unknown request");
        
        if (err.length > 0) {
            emit ResolutionFailed(marketId, err);
            return;
        }
        
        // 解析响应 ("true" 或 "false")
        bool outcome = keccak256(response) == keccak256(bytes("true"));
        
        // 解决市场
        marketContract.resolveMarket(marketId, outcome);
        
        emit ResolutionFulfilled(marketId, outcome);
    }
}
```

#### 步骤 3: JavaScript 解决脚本示例

```javascript
// 示例: 检查 BTC 价格是否超过 $100,000
// 这个脚本会在 Chainlink Functions 中执行

const targetPrice = 100000;

// 调用 CoinGecko API
const response = await Functions.makeHttpRequest({
  url: 'https://api.coingecko.com/api/v3/simple/price',
  params: {
    ids: 'bitcoin',
    vs_currencies: 'usd'
  }
});

if (response.error) {
  throw Error('API request failed');
}

const btcPrice = response.data.bitcoin.usd;
const result = btcPrice >= targetPrice;

return Functions.encodeString(result.toString());
```

```javascript
// 示例: 检查某个事件是否发生 (如 Somnia Mainnet 发布)
// 通过检查官方 API 或公告

const response = await Functions.makeHttpRequest({
  url: 'https://api.somnia.network/status',
});

if (response.error) {
  throw Error('API request failed');
}

const isMainnetLive = response.data.network === 'mainnet';
return Functions.encodeString(isMainnetLive.toString());
```

#### 步骤 4: 自动化解决 (Chainlink Automation)

创建 `contracts/solidity/contracts/oracles/AutomatedResolver.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IChainlinkResolver {
    function canResolve(bytes32 marketId) external view returns (bool);
    function resolveMarket(bytes32 marketId) external;
}

/**
 * @title AutomatedResolver
 * @dev 使用 Chainlink Automation 自动检查和解决市场
 */
contract AutomatedResolver is AutomationCompatibleInterface, Ownable {
    
    IChainlinkResolver public resolver;
    bytes32[] public pendingMarkets;
    mapping(bytes32 => bool) public isTracked;
    
    constructor(address _resolver, address _owner) Ownable(_owner) {
        resolver = IChainlinkResolver(_resolver);
    }
    
    /**
     * @dev 添加待解决的市场
     */
    function addMarket(bytes32 marketId) external onlyOwner {
        require(!isTracked[marketId], "Already tracked");
        pendingMarkets.push(marketId);
        isTracked[marketId] = true;
    }
    
    /**
     * @dev Chainlink Automation 检查函数
     */
    function checkUpkeep(bytes calldata) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        bytes32[] memory toResolve = new bytes32[](pendingMarkets.length);
        uint256 count = 0;
        
        for (uint i = 0; i < pendingMarkets.length; i++) {
            if (resolver.canResolve(pendingMarkets[i])) {
                toResolve[count] = pendingMarkets[i];
                count++;
            }
        }
        
        if (count > 0) {
            // 只返回需要解决的市场
            bytes32[] memory result = new bytes32[](count);
            for (uint i = 0; i < count; i++) {
                result[i] = toResolve[i];
            }
            return (true, abi.encode(result));
        }
        
        return (false, "");
    }
    
    /**
     * @dev Chainlink Automation 执行函数
     */
    function performUpkeep(bytes calldata performData) external override {
        bytes32[] memory marketIds = abi.decode(performData, (bytes32[]));
        
        for (uint i = 0; i < marketIds.length; i++) {
            try resolver.resolveMarket(marketIds[i]) {
                // 从待处理列表移除
                _removeMarket(marketIds[i]);
            } catch {}
        }
    }
    
    function _removeMarket(bytes32 marketId) internal {
        for (uint i = 0; i < pendingMarkets.length; i++) {
            if (pendingMarkets[i] == marketId) {
                pendingMarkets[i] = pendingMarkets[pendingMarkets.length - 1];
                pendingMarkets.pop();
                isTracked[marketId] = false;
                break;
            }
        }
    }
}
```


#### 步骤 5: Chainlink Price Feeds 地址参考

```typescript
// Somnia Testnet 上可能没有 Chainlink，以下是以太坊主网参考
// 实际部署时需要确认 Somnia 支持的 Oracle

export const CHAINLINK_PRICE_FEEDS = {
  // Ethereum Mainnet
  'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
  'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  
  // Sepolia Testnet
  'ETH/USD_SEPOLIA': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  'BTC/USD_SEPOLIA': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
};
```

---

## 4. 添加真实的历史数据存储和查询

### 4.1 概述

实现链上事件的索引和历史数据查询，支持图表展示和数据分析。

### 4.2 方案选择

| 方案 | 优点 | 缺点 |
|------|------|------|
| The Graph | 去中心化、标准化 | 需要 GRT 代币 |
| 自建 Indexer | 完全控制 | 维护成本高 |
| Alchemy/Infura | 简单易用 | 中心化、成本 |
| Dune Analytics | 强大的分析 | 不适合实时 |

### 4.3 实现步骤 (The Graph)

#### 步骤 1: 初始化 Subgraph 项目

```bash
# 安装 Graph CLI
npm install -g @graphprotocol/graph-cli

# 创建 subgraph 目录
mkdir kinetix-subgraph
cd kinetix-subgraph

# 初始化项目
graph init --product hosted-service kinetix/kinetix-protocol
```

#### 步骤 2: 定义 Schema

创建 `schema.graphql`:

```graphql
# 市场实体
type Market @entity {
  id: Bytes! # marketId (bytes32)
  question: String!
  description: String!
  poolYes: BigInt!
  poolNo: BigInt!
  totalLiquidity: BigInt!
  endTime: BigInt!
  status: MarketStatus!
  outcome: Boolean
  oracle: Bytes!
  createdAt: BigInt!
  createdTxHash: Bytes!
  resolvedAt: BigInt
  resolvedTxHash: Bytes
  
  # 关联
  bets: [Bet!]! @derivedFrom(field: "market")
  yieldSnapshots: [YieldSnapshot!]! @derivedFrom(field: "market")
}

enum MarketStatus {
  Active
  Resolved
  Paused
}

# 下注实体
type Bet @entity {
  id: ID! # marketId-userAddress
  market: Market!
  user: Bytes!
  amount: BigInt!
  outcome: Boolean! # true = YES, false = NO
  timestamp: BigInt!
  claimed: Boolean!
  claimedAmount: BigInt
  claimedAt: BigInt
  txHash: Bytes!
}

# 用户实体
type User @entity {
  id: Bytes! # user address
  totalBets: BigInt!
  totalStaked: BigInt!
  totalWinnings: BigInt!
  totalYieldEarned: BigInt!
  bets: [Bet!]! @derivedFrom(field: "user")
}

# 收益快照 (用于图表)
type YieldSnapshot @entity {
  id: ID! # marketId-timestamp
  market: Market!
  timestamp: BigInt!
  blockNumber: BigInt!
  totalYield: BigInt!
  apy: BigInt!
  totalLiquidity: BigInt!
}

# 全局统计
type GlobalStats @entity {
  id: ID! # "global"
  totalMarkets: BigInt!
  totalBets: BigInt!
  totalVolume: BigInt!
  totalYieldGenerated: BigInt!
  totalUsers: BigInt!
}

# 每日统计 (用于图表)
type DailyStats @entity {
  id: ID! # date string "2025-01-01"
  date: BigInt!
  volume: BigInt!
  betsCount: BigInt!
  newUsers: BigInt!
  yieldGenerated: BigInt!
}

# 事件日志 (用于活动 Feed)
type ActivityEvent @entity {
  id: ID! # txHash-logIndex
  type: EventType!
  market: Market
  user: Bytes
  amount: BigInt
  outcome: Boolean
  timestamp: BigInt!
  blockNumber: BigInt!
  txHash: Bytes!
}

enum EventType {
  BetPlaced
  MarketCreated
  MarketResolved
  WinningsClaimed
  YieldGenerated
}
```


#### 步骤 3: 配置 Subgraph

创建 `subgraph.yaml`:

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: KinetixMarket
    network: somnia-testnet # 或 somnia-mainnet
    source:
      address: "0xE5B0B67893c9243A814fCA02845a26cE2c2B3156"
      abi: KinetixMarket
      startBlock: 1000000 # 合约部署区块
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Market
        - Bet
        - User
        - ActivityEvent
        - GlobalStats
        - DailyStats
      abis:
        - name: KinetixMarket
          file: ./abis/KinetixMarket.json
      eventHandlers:
        - event: MarketCreated(indexed bytes32,string,uint256)
          handler: handleMarketCreated
        - event: BetPlaced(indexed bytes32,indexed address,bool,uint256)
          handler: handleBetPlaced
        - event: MarketResolved(indexed bytes32,bool)
          handler: handleMarketResolved
        - event: WinningsClaimed(indexed bytes32,indexed address,uint256)
          handler: handleWinningsClaimed
      file: ./src/market.ts

  - kind: ethereum
    name: KinetixVault
    network: somnia-testnet
    source:
      address: "0xE30506c7CFA9d6b7c37946e5a2107DdED67af831"
      abi: KinetixVault
      startBlock: 1000000
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - YieldSnapshot
        - ActivityEvent
      abis:
        - name: KinetixVault
          file: ./abis/KinetixVault.json
      eventHandlers:
        - event: YieldGenerated(indexed bytes32,uint256,uint256)
          handler: handleYieldGenerated
        - event: Deposited(indexed bytes32,indexed address,uint256)
          handler: handleDeposited
      file: ./src/vault.ts
```

#### 步骤 4: 编写 Mapping 处理器

创建 `src/market.ts`:

```typescript
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  MarketCreated,
  BetPlaced,
  MarketResolved,
  WinningsClaimed,
} from "../generated/KinetixMarket/KinetixMarket";
import {
  Market,
  Bet,
  User,
  ActivityEvent,
  GlobalStats,
  DailyStats,
} from "../generated/schema";

// 辅助函数: 获取或创建全局统计
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalMarkets = BigInt.fromI32(0);
    stats.totalBets = BigInt.fromI32(0);
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalYieldGenerated = BigInt.fromI32(0);
    stats.totalUsers = BigInt.fromI32(0);
  }
  return stats;
}

// 辅助函数: 获取或创建每日统计
function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  let dayTimestamp = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
  let id = dayTimestamp.toString();
  
  let stats = DailyStats.load(id);
  if (!stats) {
    stats = new DailyStats(id);
    stats.date = dayTimestamp;
    stats.volume = BigInt.fromI32(0);
    stats.betsCount = BigInt.fromI32(0);
    stats.newUsers = BigInt.fromI32(0);
    stats.yieldGenerated = BigInt.fromI32(0);
  }
  return stats;
}

// 辅助函数: 获取或创建用户
function getOrCreateUser(address: Bytes): User {
  let user = User.load(address);
  if (!user) {
    user = new User(address);
    user.totalBets = BigInt.fromI32(0);
    user.totalStaked = BigInt.fromI32(0);
    user.totalWinnings = BigInt.fromI32(0);
    user.totalYieldEarned = BigInt.fromI32(0);
    
    // 更新全局用户数
    let globalStats = getOrCreateGlobalStats();
    globalStats.totalUsers = globalStats.totalUsers.plus(BigInt.fromI32(1));
    globalStats.save();
  }
  return user;
}

// 处理市场创建事件
export function handleMarketCreated(event: MarketCreated): void {
  let market = new Market(event.params.marketId);
  market.question = event.params.question;
  market.description = "";
  market.poolYes = BigInt.fromI32(0);
  market.poolNo = BigInt.fromI32(0);
  market.totalLiquidity = BigInt.fromI32(0);
  market.endTime = event.params.endTime;
  market.status = "Active";
  market.oracle = event.transaction.from;
  market.createdAt = event.block.timestamp;
  market.createdTxHash = event.transaction.hash;
  market.save();

  // 更新全局统计
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalMarkets = globalStats.totalMarkets.plus(BigInt.fromI32(1));
  globalStats.save();

  // 创建活动事件
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "MarketCreated";
  activity.market = event.params.marketId;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

// 处理下注事件
export function handleBetPlaced(event: BetPlaced): void {
  let betId = event.params.marketId.toHexString() + "-" + event.params.user.toHexString();
  
  let bet = new Bet(betId);
  bet.market = event.params.marketId;
  bet.user = event.params.user;
  bet.amount = event.params.amount;
  bet.outcome = event.params.outcome;
  bet.timestamp = event.block.timestamp;
  bet.claimed = false;
  bet.txHash = event.transaction.hash;
  bet.save();

  // 更新市场
  let market = Market.load(event.params.marketId);
  if (market) {
    if (event.params.outcome) {
      market.poolYes = market.poolYes.plus(event.params.amount);
    } else {
      market.poolNo = market.poolNo.plus(event.params.amount);
    }
    market.totalLiquidity = market.poolYes.plus(market.poolNo);
    market.save();
  }

  // 更新用户
  let user = getOrCreateUser(event.params.user);
  user.totalBets = user.totalBets.plus(BigInt.fromI32(1));
  user.totalStaked = user.totalStaked.plus(event.params.amount);
  user.save();

  // 更新全局统计
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalBets = globalStats.totalBets.plus(BigInt.fromI32(1));
  globalStats.totalVolume = globalStats.totalVolume.plus(event.params.amount);
  globalStats.save();

  // 更新每日统计
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.volume = dailyStats.volume.plus(event.params.amount);
  dailyStats.betsCount = dailyStats.betsCount.plus(BigInt.fromI32(1));
  dailyStats.save();

  // 创建活动事件
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "BetPlaced";
  activity.market = event.params.marketId;
  activity.user = event.params.user;
  activity.amount = event.params.amount;
  activity.outcome = event.params.outcome;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

// 处理市场解决事件
export function handleMarketResolved(event: MarketResolved): void {
  let market = Market.load(event.params.marketId);
  if (market) {
    market.status = "Resolved";
    market.outcome = event.params.outcome;
    market.resolvedAt = event.block.timestamp;
    market.resolvedTxHash = event.transaction.hash;
    market.save();
  }

  // 创建活动事件
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "MarketResolved";
  activity.market = event.params.marketId;
  activity.outcome = event.params.outcome;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

// 处理领取奖励事件
export function handleWinningsClaimed(event: WinningsClaimed): void {
  let betId = event.params.marketId.toHexString() + "-" + event.params.user.toHexString();
  
  let bet = Bet.load(betId);
  if (bet) {
    bet.claimed = true;
    bet.claimedAmount = event.params.payout;
    bet.claimedAt = event.block.timestamp;
    bet.save();
  }

  // 更新用户
  let user = getOrCreateUser(event.params.user);
  user.totalWinnings = user.totalWinnings.plus(event.params.payout);
  user.save();

  // 创建活动事件
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "WinningsClaimed";
  activity.market = event.params.marketId;
  activity.user = event.params.user;
  activity.amount = event.params.payout;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}
```


#### 步骤 5: 创建 Vault 事件处理器

创建 `src/vault.ts`:

```typescript
import { BigInt } from "@graphprotocol/graph-ts";
import {
  YieldGenerated,
  Deposited,
} from "../generated/KinetixVault/KinetixVault";
import {
  YieldSnapshot,
  ActivityEvent,
  GlobalStats,
  DailyStats,
} from "../generated/schema";

// 处理收益生成事件
export function handleYieldGenerated(event: YieldGenerated): void {
  // 创建收益快照
  let snapshotId = event.params.marketId.toHexString() + "-" + event.block.timestamp.toString();
  
  let snapshot = new YieldSnapshot(snapshotId);
  snapshot.market = event.params.marketId;
  snapshot.timestamp = event.block.timestamp;
  snapshot.blockNumber = event.block.number;
  snapshot.totalYield = event.params.amount;
  snapshot.apy = event.params.newAPY;
  snapshot.totalLiquidity = BigInt.fromI32(0); // 需要从合约读取
  snapshot.save();

  // 更新全局统计
  let globalStats = GlobalStats.load("global");
  if (globalStats) {
    globalStats.totalYieldGenerated = globalStats.totalYieldGenerated.plus(event.params.amount);
    globalStats.save();
  }

  // 更新每日统计
  let dayTimestamp = event.block.timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
  let dailyStats = DailyStats.load(dayTimestamp.toString());
  if (dailyStats) {
    dailyStats.yieldGenerated = dailyStats.yieldGenerated.plus(event.params.amount);
    dailyStats.save();
  }

  // 创建活动事件
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "YieldGenerated";
  activity.market = event.params.marketId;
  activity.amount = event.params.amount;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}

// 处理存款事件
export function handleDeposited(event: Deposited): void {
  // 可以用于追踪存款历史
  let activity = new ActivityEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  activity.type = "BetPlaced"; // 存款通常伴随下注
  activity.market = event.params.marketId;
  activity.user = event.params.user;
  activity.amount = event.params.amount;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.txHash = event.transaction.hash;
  activity.save();
}
```

#### 步骤 6: 部署 Subgraph

```bash
# 认证
graph auth --product hosted-service <ACCESS_TOKEN>

# 编译
graph codegen
graph build

# 部署
graph deploy --product hosted-service kinetix/kinetix-protocol
```

#### 步骤 7: 前端集成 GraphQL 查询

创建 `services/graphqlService.ts`:

```typescript
import { request, gql } from 'graphql-request';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/kinetix/kinetix-protocol';

// 查询市场列表
export const GET_MARKETS = gql`
  query GetMarkets($first: Int!, $skip: Int!, $status: MarketStatus) {
    markets(
      first: $first
      skip: $skip
      where: { status: $status }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      question
      description
      poolYes
      poolNo
      totalLiquidity
      endTime
      status
      outcome
      createdAt
    }
  }
`;

// 查询用户持仓
export const GET_USER_BETS = gql`
  query GetUserBets($user: Bytes!) {
    bets(where: { user: $user }) {
      id
      market {
        id
        question
        status
        outcome
      }
      amount
      outcome
      timestamp
      claimed
      claimedAmount
    }
  }
`;

// 查询活动 Feed
export const GET_ACTIVITY_FEED = gql`
  query GetActivityFeed($first: Int!) {
    activityEvents(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      market {
        id
        question
      }
      user
      amount
      outcome
      timestamp
      txHash
    }
  }
`;

// 查询收益历史 (用于图表)
export const GET_YIELD_HISTORY = gql`
  query GetYieldHistory($marketId: Bytes!, $since: BigInt!) {
    yieldSnapshots(
      where: { market: $marketId, timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: asc
    ) {
      timestamp
      totalYield
      apy
      totalLiquidity
    }
  }
`;

// 查询每日统计 (用于图表)
export const GET_DAILY_STATS = gql`
  query GetDailyStats($days: Int!) {
    dailyStats(
      first: $days
      orderBy: date
      orderDirection: desc
    ) {
      date
      volume
      betsCount
      newUsers
      yieldGenerated
    }
  }
`;

// 查询全局统计
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      totalMarkets
      totalBets
      totalVolume
      totalYieldGenerated
      totalUsers
    }
  }
`;

// API 函数
export async function fetchMarkets(first = 10, skip = 0, status?: string) {
  return request(SUBGRAPH_URL, GET_MARKETS, { first, skip, status });
}

export async function fetchUserBets(userAddress: string) {
  return request(SUBGRAPH_URL, GET_USER_BETS, { user: userAddress.toLowerCase() });
}

export async function fetchActivityFeed(first = 20) {
  return request(SUBGRAPH_URL, GET_ACTIVITY_FEED, { first });
}

export async function fetchYieldHistory(marketId: string, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  return request(SUBGRAPH_URL, GET_YIELD_HISTORY, { 
    marketId: marketId.toLowerCase(),
    since: since.toString()
  });
}

export async function fetchDailyStats(days = 30) {
  return request(SUBGRAPH_URL, GET_DAILY_STATS, { days });
}

export async function fetchGlobalStats() {
  return request(SUBGRAPH_URL, GET_GLOBAL_STATS);
}
```


#### 步骤 8: 创建 React Hook 使用 GraphQL 数据

创建 `hooks/useGraphQL.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarkets,
  fetchUserBets,
  fetchActivityFeed,
  fetchYieldHistory,
  fetchDailyStats,
  fetchGlobalStats,
} from '../services/graphqlService';

// 获取市场列表
export function useMarketsFromGraph(first = 10, skip = 0, status?: string) {
  return useQuery({
    queryKey: ['markets', first, skip, status],
    queryFn: () => fetchMarkets(first, skip, status),
    staleTime: 30000, // 30秒缓存
    refetchInterval: 60000, // 每分钟刷新
  });
}

// 获取用户持仓
export function useUserBetsFromGraph(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['userBets', userAddress],
    queryFn: () => fetchUserBets(userAddress!),
    enabled: !!userAddress,
    staleTime: 10000,
  });
}

// 获取活动 Feed
export function useActivityFeed(first = 20) {
  return useQuery({
    queryKey: ['activityFeed', first],
    queryFn: () => fetchActivityFeed(first),
    staleTime: 5000,
    refetchInterval: 10000, // 每10秒刷新
  });
}

// 获取收益历史 (用于图表)
export function useYieldHistory(marketId: string, days = 30) {
  return useQuery({
    queryKey: ['yieldHistory', marketId, days],
    queryFn: () => fetchYieldHistory(marketId, days),
    enabled: !!marketId,
    staleTime: 60000,
  });
}

// 获取每日统计
export function useDailyStats(days = 30) {
  return useQuery({
    queryKey: ['dailyStats', days],
    queryFn: () => fetchDailyStats(days),
    staleTime: 300000, // 5分钟缓存
  });
}

// 获取全局统计
export function useGlobalStats() {
  return useQuery({
    queryKey: ['globalStats'],
    queryFn: fetchGlobalStats,
    staleTime: 60000,
  });
}
```

#### 步骤 9: 更新图表组件使用真实数据

更新 `components/MarketDetail.tsx` 中的图表部分:

```typescript
import { useYieldHistory } from '../hooks/useGraphQL';

// 在组件中
const { data: yieldHistory, isLoading: loadingHistory } = useYieldHistory(market.id, 30);

// 转换数据格式
const chartData = useMemo(() => {
  if (!yieldHistory?.yieldSnapshots) return [];
  
  return yieldHistory.yieldSnapshots.map((snapshot: any) => ({
    time: new Date(parseInt(snapshot.timestamp) * 1000).toLocaleDateString(),
    value: parseFloat(snapshot.totalYield) / 1e18, // 转换 wei 到 ETH
    apy: parseFloat(snapshot.apy) / 100, // 转换基点到百分比
  }));
}, [yieldHistory]);

// 在 JSX 中
{loadingHistory ? (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="animate-spin" />
  </div>
) : (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={chartData}>
      {/* ... 图表配置 */}
    </AreaChart>
  </ResponsiveContainer>
)}
```

---

## 5. 部署清单

### 5.1 合约部署顺序

```
1. 部署 SomniaStakingStrategy (或其他策略)
2. 部署 KinetixVaultV2 (传入策略地址)
3. 设置策略的 Vault 地址
4. 部署 KinetixMarket
5. 关联 Market 和 Vault
6. 部署 ChainlinkResolver
7. 部署 AutomatedResolver
8. 创建市场并设置 Oracle 条件
9. 注册 Chainlink Automation
```

### 5.2 前端配置更新

```typescript
// config/production.ts
export const PRODUCTION_CONFIG = {
  // 合约地址
  contracts: {
    market: '0x...',
    vault: '0x...',
    resolver: '0x...',
  },
  
  // SDS 配置
  sds: {
    wsEndpoint: 'wss://sds.somnia.network/ws',
    apiKey: process.env.VITE_SDS_API_KEY,
  },
  
  // The Graph 配置
  subgraph: {
    url: 'https://api.thegraph.com/subgraphs/name/kinetix/kinetix-protocol',
  },
  
  // Chainlink 配置
  chainlink: {
    priceFeeds: {
      'BTC/USD': '0x...',
      'ETH/USD': '0x...',
    },
  },
};
```

### 5.3 环境变量

```env
# .env.production
VITE_NETWORK=somnia-mainnet
VITE_MARKET_CONTRACT=0x...
VITE_VAULT_CONTRACT=0x...
VITE_SDS_WS_ENDPOINT=wss://sds.somnia.network/ws
VITE_SDS_API_KEY=your_api_key
VITE_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/kinetix/kinetix-protocol
VITE_GEMINI_API_KEY=your_gemini_key
```

---

## 6. 测试清单

### 6.1 合约测试

- [ ] 策略存款/提取功能
- [ ] Vault 收益计算准确性
- [ ] Oracle 价格获取
- [ ] 市场自动解决
- [ ] 奖励计算和分发

### 6.2 前端测试

- [ ] SDS 实时连接
- [ ] GraphQL 查询
- [ ] 图表数据展示
- [ ] 活动 Feed 更新
- [ ] 错误处理

### 6.3 集成测试

- [ ] 完整下注流程
- [ ] 收益累积验证
- [ ] 市场解决流程
- [ ] 奖励领取流程

---

## 7. 监控和维护

### 7.1 监控指标

- 合约事件监听
- Subgraph 同步状态
- SDS 连接状态
- Oracle 价格更新频率
- 用户交易成功率

### 7.2 告警设置

- 合约暂停事件
- 大额交易
- Oracle 价格异常
- Subgraph 同步延迟
- SDS 断连

---

## 总结

本指南涵盖了将 Kinetix Protocol 从 MVP 升级到生产环境的四个核心功能:

1. **SDS 集成**: 使用 WebSocket 订阅链上事件，实现真正的实时数据
2. **DeFi 集成**: 通过策略模式接入真实的 Staking/Lending 协议
3. **Oracle 集成**: 使用 Chainlink 实现自动化市场解决
4. **历史数据**: 使用 The Graph 索引链上事件，支持复杂查询

每个功能都提供了详细的代码示例和部署步骤，可以根据实际需求进行调整和扩展。


---

## 附录: 最新 API 参考 (2025年11月更新)

### A.1 Wagmi v2 最新用法

#### useWriteContract + useWaitForTransactionReceipt 组合

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

function PlaceBetButton() {
  const { 
    writeContract, 
    data: hash, 
    isPending,
    error: writeError,
  } = useWriteContract()

  // 等待交易确认
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash, // 传入交易 hash
    confirmations: 1, // 等待确认数
  })

  const handleBet = () => {
    writeContract({
      address: '0x...',
      abi: MarketABI,
      functionName: 'placeBet',
      args: [marketId, outcome],
      value: parseEther(amount),
    })
  }

  return (
    <button onClick={handleBet} disabled={isPending || isConfirming}>
      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Place Bet'}
    </button>
  )
}
```

### A.2 Chainlink Price Feeds 最新用法

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract DataConsumerV3 {
    AggregatorV3Interface internal dataFeed;

    constructor(address _priceFeed) {
        dataFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * 获取最新价格
     * 返回值有 8 位小数 (例如 BTC/USD)
     */
    function getLatestPrice() public view returns (int256) {
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            /* uint256 updatedAt */,
            /* uint80 answeredInRound */
        ) = dataFeed.latestRoundData();
        return answer;
    }
}
```

**Sepolia 测试网 Price Feed 地址:**
- BTC/USD: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`
- ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

### A.3 Chainlink Automation 最新接口

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract AutomatedMarketResolver is AutomationCompatibleInterface {
    
    /**
     * @dev 由 Chainlink Automation 节点调用 (off-chain)
     * @param checkData 注册时设置的固定数据
     * @return upkeepNeeded 是否需要执行 performUpkeep
     * @return performData 传递给 performUpkeep 的数据
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // 解码 checkData
        (uint256 lowerBound, uint256 upperBound) = abi.decode(
            checkData,
            (uint256, uint256)
        );
        
        // 检查是否有需要解决的市场
        bytes32[] memory marketsToResolve = new bytes32[](10);
        uint256 count = 0;
        
        for (uint256 i = lowerBound; i <= upperBound && count < 10; i++) {
            bytes32 marketId = pendingMarkets[i];
            if (canResolve(marketId)) {
                marketsToResolve[count] = marketId;
                count++;
            }
        }
        
        upkeepNeeded = count > 0;
        performData = abi.encode(marketsToResolve, count);
    }
    
    /**
     * @dev 由 Chainlink Automation 节点执行 (on-chain)
     * @param performData 来自 checkUpkeep 的数据
     */
    function performUpkeep(bytes calldata performData) external override {
        (bytes32[] memory markets, uint256 count) = abi.decode(
            performData,
            (bytes32[], uint256)
        );
        
        for (uint256 i = 0; i < count; i++) {
            _resolveMarket(markets[i]);
        }
    }
}
```

### A.4 The Graph Subgraph 最新部署流程

```bash
# 1. 安装 Graph CLI
npm install -g @graphprotocol/graph-cli

# 2. 初始化项目
graph init --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME>

# 3. 生成代码
graph codegen

# 4. 构建
graph build

# 5. 认证 (获取 Access Token: https://thegraph.com/studio/)
graph auth --product hosted-service <ACCESS_TOKEN>

# 6. 部署
graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME>
```

**subgraph.yaml 最新格式:**

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: KinetixMarket
    network: somnia-testnet
    source:
      address: "0xE5B0B67893c9243A814fCA02845a26cE2c2B3156"
      abi: KinetixMarket
      startBlock: 1000000
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7  # 最新 API 版本
      language: wasm/assemblyscript
      entities:
        - Market
        - Bet
      abis:
        - name: KinetixMarket
          file: ./abis/KinetixMarket.json
      eventHandlers:
        - event: BetPlaced(indexed bytes32,indexed address,bool,uint256)
          handler: handleBetPlaced
      file: ./src/mapping.ts
```

### A.5 GraphQL 查询最佳实践

```typescript
import { request, gql } from 'graphql-request';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/kinetix/kinetix-protocol';

// 使用 Fragment 复用查询字段
const MARKET_FIELDS = gql`
  fragment MarketFields on Market {
    id
    question
    poolYes
    poolNo
    totalLiquidity
    status
    outcome
    createdAt
  }
`;

// 分页查询
export const GET_MARKETS_PAGINATED = gql`
  ${MARKET_FIELDS}
  query GetMarkets($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    markets(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ...MarketFields
    }
  }
`;

// 使用 React Query 进行数据获取
import { useQuery } from '@tanstack/react-query';

export function useMarkets(page = 0, pageSize = 10) {
  return useQuery({
    queryKey: ['markets', page, pageSize],
    queryFn: () => request(SUBGRAPH_URL, GET_MARKETS_PAGINATED, {
      first: pageSize,
      skip: page * pageSize,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
```

### A.6 WebSocket 实时订阅 (替代 SDS)

如果 Somnia 不提供专用 SDS SDK，可以使用标准 JSON-RPC WebSocket 订阅：

```typescript
import { createPublicClient, webSocket } from 'viem';
import { somniaTestnet } from './chains';

// 创建 WebSocket 客户端
const wsClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket('wss://dream-rpc.somnia.network/ws'),
});

// 订阅合约事件
export function subscribeToMarketEvents(
  contractAddress: `0x${string}`,
  onBetPlaced: (log: any) => void
) {
  return wsClient.watchContractEvent({
    address: contractAddress,
    abi: MarketABI,
    eventName: 'BetPlaced',
    onLogs: (logs) => {
      logs.forEach(onBetPlaced);
    },
  });
}

// 订阅新区块
export function subscribeToBlocks(onBlock: (block: any) => void) {
  return wsClient.watchBlocks({
    onBlock,
  });
}
```

---

## 重要提示

1. **Somnia 网络兼容性**: 在部署前确认 Somnia 是否支持 Chainlink 服务。如果不支持，需要使用自建 Oracle 或其他替代方案。

2. **Gas 优化**: Chainlink Automation 的 `checkUpkeep` 应该尽量在 off-chain 完成计算，减少 `performUpkeep` 的 gas 消耗。

3. **The Graph 网络支持**: 确认 The Graph 是否支持 Somnia 网络。如果不支持，可以考虑自建 Graph Node 或使用其他索引服务。

4. **安全审计**: 生产部署前务必进行安全审计，特别是涉及资金的合约。
