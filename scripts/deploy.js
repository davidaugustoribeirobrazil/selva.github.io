const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.OWNER_ADDRESS || deployer.address;
  const decimals = ethers.parseUnits("1", 18); // 1e18

  // Default initial supply: 1,000,000 SELVA if not provided
  const initialSupplyStr = process.env.INITIAL_SUPPLY || (1_000_000n * 10n ** 18n).toString();
  const initialSupply = BigInt(initialSupplyStr);

  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);
  console.log("Initial supply (wei):", initialSupply.toString());

  const SELVA = await ethers.getContractFactory("SELVA");
  const selva = await SELVA.deploy(initialSupply, owner);
  await selva.waitForDeployment();
  const addr = await selva.getAddress();

  console.log("SELVA deployed to:", addr);

  // Helpful output for verification
  console.log("\nTo verify:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${addr} ${initialSupply.toString()} ${owner}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
