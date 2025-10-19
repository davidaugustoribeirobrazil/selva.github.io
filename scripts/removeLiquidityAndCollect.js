require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

// Endereço do NonfungiblePositionManager na Base
const NPM_ADDR = "0x03a520b32c04bf3beef7beb72e919cf822ed34f1";

// ABI mínima CORRETA do NPM
const NPM_ABI = [
  // ERC721 básico + enumerable
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",

  // positions() com a ORDEM CORRETA
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",

  // gerência
  "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
  "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
  "function burn(uint256 tokenId) external"
];

// helper: bump automático de taxas se o RPC reclamar “underpriced”
async function sendWithBump(sendFn, provider) {
  const fee = await provider.getFeeData();
  let maxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 1n;
  let maxPrio = fee.maxPriorityFeePerGas ?? 1n;

  // bump inicial
  maxFee  = (maxFee  * 120n) / 100n; // +20%
  maxPrio = (maxPrio * 150n) / 100n; // +50%

  for (let i = 0; i < 6; i++) {
    try {
      return await sendFn({ maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio });
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("underpriced") || msg.includes("replacement")) {
        maxFee  = (maxFee  * 120n) / 100n;
        maxPrio = (maxPrio * 120n) / 100n;
        continue;
      }
      throw e;
    }
  }
  return await sendFn({ maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio });
}

async function main() {
  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();
  const provider = ethers.provider;

  console.log("Network:", hre.network.name);
  console.log("Operator:", me);

  const npm = new ethers.Contract(NPM_ADDR, NPM_ABI, signer);

  // 1) Descobrir o tokenId da posição
  let tokenId;
  if (process.env.TOKEN_ID) {
    tokenId = BigInt(process.env.TOKEN_ID);
  } else {
    const count = await npm.balanceOf(me);
    if (count === 0n) throw new Error("Você não possui posições (NFTs do NPM).");
    tokenId = await npm.tokenOfOwnerByIndex(me, count - 1n); // último NFT
  }
  console.log("tokenId:", tokenId.toString());

  // 2) Validar propriedade e ler a posição (com a ABI correta)
  const owner = await npm.ownerOf(tokenId);
  if (owner.toLowerCase() !== me.toLowerCase()) {
    throw new Error("Este tokenId não pertence a você.");
  }

  const pos = await npm.positions(tokenId);
  // mapeamento com base na assinatura correta
  const nonce   = pos[0];
  const operator = pos[1];
  const token0  = pos[2];
  const token1  = pos[3];
  const fee     = pos[4];
  const tickL   = pos[5];
  const tickU   = pos[6];
  const liquidity = pos[7]; // uint128
  const feeGrowthInside0LastX128 = pos[8];
  const feeGrowthInside1LastX128 = pos[9];
  const tokensOwed0 = pos[10]; // uint128
  const tokensOwed1 = pos[11]; // uint128

  console.log("Position:", {
    token0, token1, fee, tickLower: tickL, tickUpper: tickU,
    liquidity: liquidity.toString(),
    tokensOwed0: tokensOwed0.toString(),
    tokensOwed1: tokensOwed1.toString(),
    operator
  });

  let nextNonce = await provider.getTransactionCount(me, "pending");

  // 3) Se houver liquidez, remova 100% (decreaseLiquidity)
  if (liquidity > 0n) {
    console.log("Decreasing 100% liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const paramsDec = {
      tokenId,
      liquidity,
      amount0Min: 0n, // sem mínimo (ajuste se quiser proteção)
      amount1Min: 0n,
      deadline
    };

    const txDec = await sendWithBump(
      (feeOpts) => npm.decreaseLiquidity(paramsDec, { nonce: nextNonce, ...feeOpts }),
      provider
    );
    console.log("decrease tx:", txDec.hash);
    await txDec.wait();
    nextNonce += 1;
  } else {
    console.log("A posição já está com liquidity = 0.");
  }

  // 4) Coletar tudo (principal + taxas)
  const UINT128_MAX = (1n << 128n) - 1n;
  console.log("Collecting all...");
  const paramsCol = {
    tokenId,
    recipient: me,
    amount0Max: UINT128_MAX,
    amount1Max: UINT128_MAX
  };
  const txCol = await sendWithBump(
    (feeOpts) => npm.collect(paramsCol, { nonce: nextNonce, ...feeOpts }),
    provider
  );
  console.log("collect tx:", txCol.hash);
  await txCol.wait();
  nextNonce += 1;

  // 5) (Opcional) Burn do NFT, se quiser “remover de vez”
  if (process.env.BURN_AFTER === "true") {
    console.log("Burning position NFT...");
    const txBurn = await sendWithBump(
      (feeOpts) => npm.burn(tokenId, { nonce: nextNonce, ...feeOpts }),
      provider
    );
    console.log("burn tx:", txBurn.hash);
    await txBurn.wait();
    nextNonce += 1;
  } else {
    console.log("NFT mantido (liquidity = 0). Você pode reativar depois com increaseLiquidity.");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
