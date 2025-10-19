require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const { parseUnits } = require("ethers");

const NPM = "0x03a520b32c04bf3beef7beb72e919cf822ed34f1";

// ABI mínima para increaseLiquidity + utilidades
const ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function positions(uint256 tokenId) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)",
  "function increaseLiquidity((uint256 tokenId,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)"
];

const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
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
  console.log("Network:", hre.network.name);
  console.log("Operator:", me);

  const npm = new ethers.Contract(NPM, ABI, s);

  // 1) Descobrir tokenId (usa TOKEN_ID do .env, ou o último NFT)
  let tokenId = process.env.TOKEN_ID ? BigInt(process.env.TOKEN_ID) : null;
  if (!tokenId) {
    const n = await npm.balanceOf(me);
    if (n === 0n) throw new Error("Você não possui NFT de posição. Use mint.");
    tokenId = await npm.tokenOfOwnerByIndex(me, n - 1n);
  }
  console.log("tokenId:", tokenId.toString());

  // 2) Ler posição para achar token0 (SELVA)
  const pos = await npm.positions(tokenId);
  const token0 = pos[2];  // address
  const token1 = pos[3];  // address
  console.log("position tokens:", { token0, token1 });

  // 3) Montar amount desejado (single-sided: só token0 / SELVA)
  const selva = new ethers.Contract(token0, erc20Abi, s);
  const decSelva = await selva.decimals();
  const balanceSelva = await selva.balanceOf(me);

  // alvo: .env AMOUNT_SELVA ou 100000 por padrão
  const desiredHuman = process.env.AMOUNT_SELVA || "100000";
  const desired = parseUnits(desiredHuman, decSelva);

  const amount0Desired = balanceSelva < desired ? balanceSelva : desired;
  const amount1Desired = 0n;

  if (amount0Desired === 0n) {
    throw new Error("Saldo SELVA insuficiente para increaseLiquidity.");
  }

  // 4) Approve se necessário
  const allowance = await selva.allowance(me, NPM);
  if (allowance < amount0Desired) {
    console.log("Approving SELVA to NPM...");
    const txA = await sendWithBump((fee) => selva.approve(NPM, amount0Desired, fee));
    console.log("approve tx:", txA.hash);
    await txA.wait();
  }

  // 5) increaseLiquidity
  const params = {
    tokenId,
    amount0Desired,
    amount1Desired,
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now()/1000) + 60*20
  };

  console.log("Increasing liquidity (single-sided SELVA)...");
  const tx = await sendWithBump((fee) => npm.increaseLiquidity(params, fee));
  console.log("increase tx:", tx.hash);
  await tx.wait();

  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
