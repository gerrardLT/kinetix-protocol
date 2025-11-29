import { expect } from "chai";
const { ethers } = require("hardhat");


describe("KinetixMarket", function () {
  let market: any;
  let vault: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let marketId: string;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Vault
    const Vault = await ethers.getContractFactory("KinetixVault");
    vault = await Vault.deploy(owner.address);
    await vault.waitForDeployment();

    // Deploy Market
    const Market = await ethers.getContractFactory("KinetixMarket");
    market = await Market.deploy(owner.address);
    await market.waitForDeployment();

    // Configure
    await market.setVault(await vault.getAddress());
    await vault.setMarketContract(await market.getAddress());

    // Create a test market
    marketId = ethers.id("test-market-1");
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 1 day
    await market.createMarket(
      marketId,
      "Will ETH reach $5000?",
      "Test market description",
      endTime,
      owner.address
    );
  });

  describe("Market Creation", function () {
    it("Should create a market correctly", async function () {
      const [question, description, poolYes, poolNo] = await market.getMarket(marketId);
      expect(question).to.equal("Will ETH reach $5000?");
      expect(poolYes).to.equal(0);
      expect(poolNo).to.equal(0);
    });

    it("Should not allow duplicate market IDs", async function () {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        market.createMarket(marketId, "Duplicate", "Test", endTime, owner.address)
      ).to.be.revertedWith("Market already exists");
    });
  });

  describe("Betting", function () {
    it("Should allow placing YES bet", async function () {
      const betAmount = ethers.parseEther("0.1");
      await market.connect(user1).placeBet(marketId, true, { value: betAmount });

      const [, , poolYes, poolNo] = await market.getMarket(marketId);
      expect(poolYes).to.equal(betAmount);
      expect(poolNo).to.equal(0);
    });

    it("Should allow placing NO bet", async function () {
      const betAmount = ethers.parseEther("0.1");
      await market.connect(user1).placeBet(marketId, false, { value: betAmount });

      const [, , poolYes, poolNo] = await market.getMarket(marketId);
      expect(poolYes).to.equal(0);
      expect(poolNo).to.equal(betAmount);
    });

    it("Should record user position correctly", async function () {
      const betAmount = ethers.parseEther("0.1");
      await market.connect(user1).placeBet(marketId, true, { value: betAmount });

      const [amount, outcome, , claimed] = await market.getUserPosition(marketId, user1.address);
      expect(amount).to.equal(betAmount);
      expect(outcome).to.equal(true);
      expect(claimed).to.equal(false);
    });

    it("Should not allow betting twice", async function () {
      const betAmount = ethers.parseEther("0.1");
      await market.connect(user1).placeBet(marketId, true, { value: betAmount });
      
      await expect(
        market.connect(user1).placeBet(marketId, false, { value: betAmount })
      ).to.be.revertedWith("Already has position");
    });
  });

  describe("Market Resolution", function () {
    it("Should allow owner to resolve market", async function () {
      await market.resolveMarket(marketId, true);
      const [, , , , , status, outcome] = await market.getMarket(marketId);
      expect(status).to.equal(1); // Resolved
      expect(outcome).to.equal(true);
    });
  });

  describe("Claiming Winnings", function () {
    it("Should allow winner to claim", async function () {
      const betAmount = ethers.parseEther("0.1");
      
      // User1 bets YES, User2 bets NO
      await market.connect(user1).placeBet(marketId, true, { value: betAmount });
      await market.connect(user2).placeBet(marketId, false, { value: betAmount });

      // Resolve as YES wins
      await market.resolveMarket(marketId, true);

      // Fund vault for payout
      await owner.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1")
      });

      // User1 claims
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await market.connect(user1).claimWinnings(marketId);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Should receive more than bet amount (stake + winnings)
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow loser to claim", async function () {
      const betAmount = ethers.parseEther("0.1");
      
      await market.connect(user1).placeBet(marketId, true, { value: betAmount });
      await market.connect(user2).placeBet(marketId, false, { value: betAmount });

      // Resolve as YES wins
      await market.resolveMarket(marketId, true);

      // User2 (NO) tries to claim
      await expect(
        market.connect(user2).claimWinnings(marketId)
      ).to.be.revertedWith("Not a winner");
    });
  });

  describe("Market Odds", function () {
    it("Should calculate odds correctly", async function () {
      await market.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("0.3") });
      await market.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("0.1") });

      const [yesOdds, noOdds] = await market.getMarketOdds(marketId);
      expect(yesOdds).to.equal(75); // 75%
      expect(noOdds).to.equal(25);  // 25%
    });
  });
});
