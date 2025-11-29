import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy Vault
  console.log("\n1. Deploying KinetixVault...");
  const Vault = await ethers.getContractFactory("KinetixVault");
  const vault = await Vault.deploy(deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("KinetixVault deployed to:", vaultAddress);

  // 2. Deploy Market
  console.log("\n2. Deploying KinetixMarket...");
  const Market = await ethers.getContractFactory("KinetixMarket");
  const market = await Market.deploy(deployer.address);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("KinetixMarket deployed to:", marketAddress);

  // 3. Configure contracts
  console.log("\n3. Configuring contracts...");
  
  // Set vault in market
  await market.setVault(vaultAddress);
  console.log("Market vault set to:", vaultAddress);
  
  // Set market in vault
  await vault.setMarketContract(marketAddress);
  console.log("Vault market contract set to:", marketAddress);

  // 4. Create initial markets
  console.log("\n4. Creating initial markets...");
  
  const markets = [
    {
      id: ethers.id("m1"),
      question: "Will Bitcoin break $100k by Q4 2025?",
      description: "Prediction market based on the price of BTC/USD on major exchanges.",
      endTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
    },
    {
      id: ethers.id("m2"),
      question: "Will Somnia Mainnet launch before June 2025?",
      description: "Based on official announcements from the Somnia Foundation.",
      endTime: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 6 months
    },
    {
      id: ethers.id("m3"),
      question: "Will the Fed cut interest rates in the next FOMC meeting?",
      description: "Binary outcome based on the official Federal Reserve statement.",
      endTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 1 month
    },
  ];

  for (const m of markets) {
    await market.createMarket(
      m.id,
      m.question,
      m.description,
      m.endTime,
      deployer.address // Oracle = deployer for MVP
    );
    console.log(`Created market: ${m.question.substring(0, 30)}...`);
  }

  // 5. Output summary
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log(`  KinetixMarket: ${marketAddress}`);
  console.log(`  KinetixVault:  ${vaultAddress}`);
  console.log("\nMarket IDs:");
  markets.forEach((m, i) => {
    console.log(`  m${i + 1}: ${m.id}`);
  });
  console.log("\n========================================");
  console.log("\nUpdate these addresses in:");
  console.log("  contracts/addresses.ts");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
