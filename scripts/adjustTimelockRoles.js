const { ethers } = require("hardhat");

const TIMELOCK = "0x61D2C8739F32D34A574416B0803cEFAc3E845ccd";
const SAFE    = "0x9f84aECC790A06aB198d206D17d21793905e2EDE";

async function main() {
  const tl = await ethers.getContractAt("SelvaTimelock", TIMELOCK);

  const PROPOSER_ROLE = await tl.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await tl.EXECUTOR_ROLE();
  const ADMIN_ROLE    = tl.TIMELOCK_ADMIN_ROLE
    ? await tl.TIMELOCK_ADMIN_ROLE()
    : await tl.DEFAULT_ADMIN_ROLE();

  console.log("Roles before:");
  console.log(" SAFE proposer?", await tl.hasRole(PROPOSER_ROLE, SAFE));
  console.log(" ANY executor?", await tl.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress));
  console.log(" SAFE admin?   ", await tl.hasRole(ADMIN_ROLE, SAFE));

  // 1) garantir SAFE como executor
  if (!(await tl.hasRole(EXECUTOR_ROLE, SAFE))) {
    const tx1 = await tl.grantRole(EXECUTOR_ROLE, SAFE);
    console.log("grant EXECUTOR to SAFE tx:", tx1.hash);
    await tx1.wait();
  }

  // 2) remover executores "qualquer um"
  if (await tl.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)) {
    const tx2 = await tl.revokeRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    console.log("revoke EXECUTOR from ANY tx:", tx2.hash);
    await tx2.wait();
  }

  console.log("Roles after:");
  console.log(" SAFE proposer?", await tl.hasRole(PROPOSER_ROLE, SAFE));
  console.log(" ANY executor?", await tl.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress));
  console.log(" SAFE executor?", await tl.hasRole(EXECUTOR_ROLE, SAFE));
}

main().catch((e) => { console.error(e); process.exit(1); });
