require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

const NPM = "0x03a520b32c04bf3beef7beb72e919cf822ed34f1";
const ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function burn(uint256 tokenId) external"
];

async function sendWithBump(sendFn) {
  const fee = await ethers.provider.getFeeData();
  let maxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 1n;
  let maxPrio = fee.maxPriorityFeePerGas ?? 1n;
  maxFee  = (maxFee  * 120n) / 100n;
  maxPrio = (maxPrio * 150n) / 100n;
  return sendFn({ maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio });
}

async function main() {
  const [s] = await ethers.getSigners();
  const me = await s.getAddress();
  console.log("Network:", hre.network.name, "Operator:", me);

  const npm = new ethers.Contract(NPM, ABI, s);
  let tokenId = process.env.TOKEN_ID ? BigInt(process.env.TOKEN_ID) : null;
  if (!tokenId) {
    const n = await npm.balanceOf(me);
    if (n === 0n) throw new Error("Nenhum NFT do NPM encontrado.");
    tokenId = await npm.tokenOfOwnerByIndex(me, n - 1n);
  }
  console.log("Burning tokenId:", tokenId.toString());

  // pequena espera para evitar limite de in-flight tx
  await new Promise(r => setTimeout(r, 4000));
  const tx = await sendWithBump((fee) => npm.burn(tokenId, fee));
  console.log("burn tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
