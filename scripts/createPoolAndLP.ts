import "dotenv/config";
import { ethers } from "hardhat";
import { Contract, parseUnits, Interface } from "ethers";
import { Token, Price } from "@uniswap/sdk-core";
import { encodeSqrtRatioX96, priceToClosestTick, nearestUsableTick } from "@uniswap/v3-sdk";
import { getAddress } from "viem";

const NPM = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const FACTORY = "0xCb2436774C3e191c85056d248EF4260Ce5F27A9D";
const USDC = "0x833589fCD6EDb6E08f4c7C32D4f71B54Bda02913";
const WETH = "0x4200000000000000000000000000000000000006";

const SELVA = process.env.SELVA_ADDRESS!;
const BASE_TOKEN = (process.env.PAIR_TOKEN || "USDC").toUpperCase() === "WETH" ? WETH : USDC;
const FEE = Number(process.env.FEE || 3000) as 500|3000|10000;
const TARGET_PRICE = Number(process.env.TARGET_PRICE || "0.01");
const RANGE_PCT = Number(process.env.RANGE_PCT || "20");
const AMOUNT_SELVA = process.env.AMOUNT_SELVA || "500000";

const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

const npmAbi = [
  "function createAndInitializePoolIfNecessary(address,address,uint24,uint160) external payable returns (address pool)",
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
];

const factoryAbi = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

function sortTokens(a: string, b: string) {
  return getAddress(a) < getAddress(b) ? [a, b] : [b, a];
}

function tickSpacing(fee: number) {
  if (fee === 100) return 1;
  if (fee === 500) return 10;
  if (fee === 3000) return 60;
  if (fee === 10000) return 200;
  throw new Error("fee inválida");
}

async function main() {
  if (!SELVA) throw new Error("Defina SELVA_ADDRESS no .env");

  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();
  console.log("Network:", ethers.network.name);
  console.log("Deployer:", me);

  const tokenSelva = new Contract(SELVA, erc20Abi, signer);
  const tokenBase = new Contract(BASE_TOKEN, erc20Abi, signer);

  const decSelva = await tokenSelva.decimals();
  const decBase = await tokenBase.decimals();
  const symSelva = await tokenSelva.symbol().catch(() => "SELVA");
  const symBase = await tokenBase.symbol().catch(() => (BASE_TOKEN.toLowerCase() === USDC.toLowerCase() ? "USDC" : "WETH"));

  const [token0Addr, token1Addr] = sortTokens(SELVA, BASE_TOKEN);
  const token0IsSelva = token0Addr.toLowerCase() === SELVA.toLowerCase();

  const token0 = new Token(8453, token0Addr, token0IsSelva ? decSelva : decBase, token0IsSelva ? symSelva : symBase);
  const token1 = new Token(8453, token0IsSelva ? BASE_TOKEN : SELVA, token0IsSelva ? decBase : decSelva, token0IsSelva ? symBase : symSelva);

  let priceToken1OverToken0: number;
  if (token0IsSelva) {
    priceToken1OverToken0 = TARGET_PRICE * 10 ** (token1.decimals - token0.decimals);
  } else {
    priceToken1OverToken0 = (1 / TARGET_PRICE) * 10 ** (token1.decimals - token0.decimals);
  }

  const sqrtPriceX96 = encodeSqrtRatioX96(
    BigInt(Math.floor(priceToken1OverToken0 * 1e12)),
    1_000_000_000_000n
  );

  const centerPrice = new Price(token0, token1, 10n ** BigInt(token0.decimals), BigInt(Math.floor(priceToken1OverToken0 * 10 ** token1.decimals)));
  const centerTick = priceToClosestTick(centerPrice);
  const spacing = tickSpacing(FEE);
  const tickLower = nearestUsableTick(Math.round(centerTick * (1 - RANGE_PCT / 100)), spacing);
  const tickUpper = nearestUsableTick(Math.round(centerTick * (1 + RANGE_PCT / 100)), spacing);

  const amtSelva = parseUnits(AMOUNT_SELVA, decSelva);
  const amtBaseFloat = Number(AMOUNT_SELVA) * TARGET_PRICE;
  const amtBase = parseUnits(amtBaseFloat.toFixed(decBase), decBase);

  console.log(`\n=== Pair & Params ===`);
  console.log(`Pair: ${token0.symbol}/${token1.symbol} (token0=${token0.address}, token1=${token1.address})`);
  console.log(`Fee: ${FEE}`);
  console.log(`Target price (token1/token0): ~${priceToken1OverToken0}`);
  console.log("Ticks:", { tickLower, centerTick, tickUpper });
  console.log("sqrtPriceX96:", sqrtPriceX96.toString());

  const npm = new Contract(NPM, npmAbi, signer);
  const needApproveSelva = await tokenSelva.allowance(me, NPM).then((v: any) => v < amtSelva);
  const needApproveBase = await tokenBase.allowance(me, NPM).then((v: any) => v < amtBase);

  if (needApproveSelva) {
    console.log("Approving SELVA...");
    await (await tokenSelva.approve(NPM, amtSelva)).wait();
  } else {
    console.log("SELVA already approved.");
  }
  if (needApproveBase) {
    console.log("Approving BASE token...");
    await (await tokenBase.approve(NPM, amtBase)).wait();
  } else {
    console.log("BASE token already approved.");
  }

  const factory = new Contract(FACTORY, factoryAbi, signer);
  const existingPool = await factory.getPool(token0.address, token1.address, FEE);
  console.log("Existing pool:", existingPool);

  console.log("\nCreating/initializing pool (if needed)...");
  const tx = await npm.createAndInitializePoolIfNecessary(token0.address, token1.address, FEE, sqrtPriceX96);
  const rc = await tx.wait();
  console.log("createAndInitializePoolIfNecessary tx:", rc?.hash);

  const pool = await factory.getPool(token0.address, token1.address, FEE);
  console.log("Pool address:", pool);

  const now = Math.floor(Date.now() / 1000);
  const params = {
    token0: token0.address,
    token1: token1.address,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: token0IsSelva ? amtSelva : amtBase,
    amount1Desired: token0IsSelva ? amtBase : amtSelva,
    amount0Min: 0,
    amount1Min: 0,
    recipient: me,
    deadline: now + 60 * 20
  };

  console.log("\nMinting LP position...");
  const txMint = await npm.mint(params);
  const rcMint = await txMint.wait();
  console.log("mint tx:", rcMint?.hash);
  console.log("\nDone. Verify your LP NFT in your wallet / explorer.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
