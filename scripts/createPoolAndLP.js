require("dotenv").config();
const hre = require("hardhat");
const { Contract, parseUnits } = require("ethers");
const { encodeSqrtRatioX96, nearestUsableTick, TickMath } = require("@uniswap/v3-sdk");
const { getAddress } = require("viem");

const { ethers } = hre;

// === Endereços na Base (mainnet) — todos em lowercase para evitar checksum ===
const NPM     = "0x03a520b32c04bf3beef7beb72e919cf822ed34f1"; // NonfungiblePositionManager
const FACTORY = "0x33128a8fc17869897dce68ed026d694621f6fdfd"; // UniswapV3Factory (oficial)
const USDC    = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC (6 dec)
const WETH    = "0x4200000000000000000000000000000000000006";

// === Env ===
const SELVA = process.env.SELVA_ADDRESS;
const BASE_TOKEN = (process.env.PAIR_TOKEN || "USDC").toUpperCase() === "WETH" ? WETH : USDC;
const FEE = Number(process.env.FEE || 3000);
const TARGET_PRICE = String(process.env.TARGET_PRICE || "0.01"); // BASE por 1 SELVA (string p/ parser)
const RANGE_PCT = Number(process.env.RANGE_PCT || "20"); // usado só p/ logs da banda simétrica
// Agora limitamos a 100.000 por padrão:
const AMOUNT_SELVA = process.env.AMOUNT_SELVA || "100000";

// ABIs mínimas
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

function sortTokens(a, b) {
  // getAddress normaliza; usamos lowercase para evitar exceções por checksum
  return getAddress(a.toLowerCase()) < getAddress(b.toLowerCase()) ? [a, b] : [b, a];
}
function tickSpacing(fee) {
  if (fee === 100) return 1;
  if (fee === 500) return 10;
  if (fee === 3000) return 60;
  if (fee === 10000) return 200;
  throw new Error("fee inválida");
}

// ---- Helpers para preço fracionário íntegro (evita underflow/0) ----
function pow10(n) { return BigInt("1" + "0".repeat(n)); }
/** Converte "0.01" com scale=12 => 10000000n */
function parseDecimalToInt(str, scale) {
  const s = String(str);
  const [intPart, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(scale)).slice(0, scale);
  return BigInt(intPart + frac);
}

// ---- Helper para enviar tx com bump de taxa se o RPC reclamar de "underpriced" ----
async function sendWithBump(sendFn) {
  const fee = await ethers.provider.getFeeData();
  // Fallbacks seguros em wei (bigint)
  let maxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 1n;
  let maxPrio = fee.maxPriorityFeePerGas ?? 1n;

  // bump inicial
  maxFee = (maxFee * 120n) / 100n;   // +20%
  maxPrio = (maxPrio * 150n) / 100n; // +50%

  // tenta com bumps progressivos
  for (let i = 0; i < 6; i++) {
    try {
      return await sendFn({ maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio });
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("underpriced") || msg.includes("replacement")) {
        maxFee = (maxFee * 120n) / 100n;   // +20% incremental
        maxPrio = (maxPrio * 120n) / 100n;
        continue;
      }
      throw e;
    }
  }
  // última tentativa
  return await sendFn({ maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio });
}

async function main() {
  if (!SELVA) throw new Error("Defina SELVA_ADDRESS no .env (endereço do token SELVA na Base)");

  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();
  console.log("Network:", hre.network.name);
  console.log("Deployer:", me);

  const tokenSelva = new Contract(SELVA, erc20Abi, signer);
  const tokenBase  = new Contract(BASE_TOKEN, erc20Abi, signer);

  const decSelva = Number(await tokenSelva.decimals());
  const decBase  = Number(await tokenBase.decimals());
  const symSelva = await tokenSelva.symbol().catch(() => "SELVA");
  const symBase  = await tokenBase.symbol().catch(() => (BASE_TOKEN.toLowerCase() === USDC ? "USDC" : "WETH"));

  // Ordenação determinística para pool v3
  const [token0Addr, token1Addr] = sortTokens(SELVA, BASE_TOKEN);
  const token0IsSelva = token0Addr.toLowerCase() === SELVA.toLowerCase();

  // === sqrtPriceX96 robusto com inteiros grandes ===
  // TARGET_PRICE = BASE por 1 SELVA (string). Vamos escalar para inteiro:
  const SCALE = 12; // precisão de 12 casas para o preço
  const P_scaled = parseDecimalToInt(TARGET_PRICE, SCALE); // BigInt
  const tenDecBase  = pow10(decBase);   // 10^decBase (BigInt)
  const tenDecSelva = pow10(decSelva);  // 10^decSelva (BigInt)
  const tenScale    = pow10(SCALE);     // 10^SCALE (BigInt)

  // token1/token0 = y / x
  let y, x;
  if (token0IsSelva) {
    // token0 = SELVA (18d), token1 = BASE (6d)
    // (BASE/SELVA) * 10^(decBase-decSelva)  =>  (P_scaled * 10^decBase) / (10^SCALE * 10^decSelva)
    y = P_scaled * tenDecBase;
    x = tenScale * tenDecSelva;
  } else {
    // token0 = BASE, token1 = SELVA
    // (SELVA/BASE) = (1/TARGET_PRICE) * 10^(decSelva-decBase)
    // => (10^SCALE * 10^decSelva) / (P_scaled * 10^decBase)
    y = tenScale * tenDecSelva;
    x = P_scaled * tenDecBase;
  }
  if (y <= 0n || x <= 0n) {
    throw new Error("Preço alvo inválido: verifique TARGET_PRICE no .env");
  }

  // (1) SDK Uniswap (JSBI) e (2) ethers (uint160)
  const sqrtPriceX96Jsbi = encodeSqrtRatioX96(y.toString(), x.toString()); // JSBI
  const sqrtPriceX96 = BigInt(sqrtPriceX96Jsbi.toString());                // bigint

  // Ticks (para referência/logs do range “teórico” simétrico)
  const centerTick = Number(TickMath.getTickAtSqrtRatio(sqrtPriceX96Jsbi));
  const spacing = Number(tickSpacing(FEE));
  const pct = RANGE_PCT / 100;
  const t1 = nearestUsableTick(Math.round(centerTick * (1 - pct)), spacing);
  const t2 = nearestUsableTick(Math.round(centerTick * (1 + pct)), spacing);
  const tickLower = Math.min(t1, t2);
  const tickUpper = Math.max(t1, t2);

  // ===== Saldo e valores-alvo =====
  const balSelva = await tokenSelva.balanceOf(me);       // bigint
  const desiredSelva = parseUnits(String(AMOUNT_SELVA), decSelva); // bigint
  // usa o menor entre saldo e desejado
  const targetSelva = balSelva < desiredSelva ? balSelva : desiredSelva;

  if (targetSelva === 0n) {
    throw new Error("Saldo de SELVA insuficiente para mint. Ajuste AMOUNT_SELVA ou envie mais SELVA.");
  }

  console.log("\n=== Balances & Targets ===");
  console.log("SELVA balance:", balSelva.toString());
  console.log("SELVA target for LP:", targetSelva.toString());

  console.log("\n=== Pair & Params ===");
  console.log(`token0=${token0Addr} ${token0IsSelva ? symSelva : symBase}`);
  console.log(`token1=${token1Addr} ${token0IsSelva ? symBase : symSelva}`);
  console.log(`fee=${FEE}`);
  console.log("centerTick:", centerTick, "tickLower:", tickLower, "tickUpper:", tickUpper);

  const npm = new Contract(NPM, npmAbi, signer);

  // ---- approvals com controle de nonce e bump automático de taxas ----
  let nextNonce = await ethers.provider.getTransactionCount(me, "pending");

  const allowSelvaNow = await tokenSelva.allowance(me, NPM);

  if (allowSelvaNow < targetSelva) {
    console.log("Approving SELVA...");
    const tx1 = await sendWithBump((feeOpts) =>
      tokenSelva.approve(NPM, targetSelva, { nonce: nextNonce, ...feeOpts })
    );
    await tx1.wait();
    nextNonce += 1;
  } else {
    console.log("SELVA já aprovado para esse montante.");
  }

  // Descobrir/Inicializar pool
  const factory = new Contract(FACTORY, factoryAbi, signer);
  const existingPool = await factory.getPool(token0Addr, token1Addr, FEE);
  console.log("Existing pool:", existingPool);

  console.log("\nCreating/initializing pool (if needed)...");
  const tx = await sendWithBump((feeOpts) =>
    npm.createAndInitializePoolIfNecessary(token0Addr, token1Addr, FEE, sqrtPriceX96, { nonce: nextNonce, ...feeOpts })
  );
  await tx.wait();
  nextNonce += 1;

  const pool = await factory.getPool(token0Addr, token1Addr, FEE);
  console.log("Pool address:", pool);
  console.log(`BaseScan:  https://basescan.org/address/${pool}`);
  console.log(`Uniswap:   https://info.uniswap.org/#/base/pools/${pool}`);

  // ===== Single-sided em SELVA (somente token0) =====
  // Faixa inteiramente ACIMA do preço atual -> depósito entra 100% em SELVA
  const stepsLower = 120;  // ~7.2% acima (120 * 60 tickSpacing) — ajuste como quiser
  const stepsUpper = 480;  // ~28.8% acima — faixa mais larga
  const tickLowerMint = nearestUsableTick(centerTick + spacing * stepsLower, spacing);
  const tickUpperMint = nearestUsableTick(centerTick + spacing * stepsUpper, spacing);

  const amount0Desired = targetSelva; // só SELVA
  const amount1Desired = 0n;          // sem USDC

  // Mint LP (single-sided SELVA)
  const now = Math.floor(Date.now() / 1000);
  const params = {
    token0: token0Addr,
    token1: token1Addr,
    fee: FEE,
    tickLower: Math.min(tickLowerMint, tickUpperMint),
    tickUpper: Math.max(tickLowerMint, tickUpperMint),
    amount0Desired,
    amount1Desired,
    amount0Min: 0,
    amount1Min: 0,
    recipient: me,
    deadline: now + 60 * 20
  };

  console.log("\nMinting LP position (single-sided SELVA)...");
  const txMint = await sendWithBump((feeOpts) =>
    npm.mint(params, { nonce: nextNonce, ...feeOpts })
  );
  const rcMint = await txMint.wait();
  console.log("mint tx:", rcMint?.hash);
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
