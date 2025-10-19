const { ethers } = require("hardhat");

async function main() {
  const net = await ethers.provider.getNetwork();
  console.log(`Network: ${net.name} (${net.chainId})`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Coloque aqui o endereço do seu SAFE na Base
  const SAFE = process.env.SELVA_SAFE || "0x9f84aECC790A06aB198d206D17d21793905e2EDE";

  // Parâmetros do timelock
  const minDelay = 2 * 24 * 60 * 60; // 2 dias, ajuste se quiser
  const proposers = [SAFE];          // o SAFE agenda/schedule
  const executors = [ethers.ZeroAddress]; // qualquer um pode executar; troque por [SAFE] se quiser só o SAFE

  // Deploy
  const Timelock = await ethers.getContractFactory("SelvaTimelock");
  const timelock = await Timelock.deploy(minDelay, proposers, executors, SAFE);
  await timelock.waitForDeployment();

  console.log(`Timelock deployed at: ${timelock.target}`);

  // Infos úteis (dependem da versão do OZ: algumas têm TIMELOCK_ADMIN_ROLE, outras só DEFAULT_ADMIN_ROLE)
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = timelock.TIMELOCK_ADMIN_ROLE
    ? await timelock.TIMELOCK_ADMIN_ROLE()
    : await timelock.DEFAULT_ADMIN_ROLE();

  console.log("Role check:");
  console.log("  SAFE is proposer? ", await timelock.hasRole(PROPOSER_ROLE, SAFE));
  console.log("  ZeroAddress executor? ", await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress));
  console.log("  SAFE is admin? ", await timelock.hasRole(ADMIN_ROLE, SAFE));

  console.log("\nPronto! Guarde o endereço acima e configure seu fluxo (transferir ownership do SELVA, etc).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
