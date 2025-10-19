const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

async function main() {
  const nets = ["base-sepolia", "base"];
  for (const n of nets) {
    const url = hre.config.networks[n].url;
    const provider = new ethers.JsonRpcProvider(url);
    const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : null;
    const addr = wallet ? await wallet.getAddress() : "(sem PRIVATE_KEY)";
    console.log(`${n}:`, addr);
    if (wallet) {
      const bal = await provider.getBalance(addr);
      console.log(`  balance: ${ethers.formatEther(bal)} ETH`);
    }
  }
}

main().catch(console.error);
