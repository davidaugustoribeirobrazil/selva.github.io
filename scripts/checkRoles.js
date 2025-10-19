const { ethers } = require("hardhat");

async function main() {
  const tlAddr = "0x61D2C8739F32D34A574416B0803cEFAc3E845ccd";
  const safe = "0x9f84aECC790A06aB198d206D17d21793905e2EDE";
  const ANY = "0x0000000000000000000000000000000000000000";

  const tl = await ethers.getContractAt("TimelockController", tlAddr);

  const EXECUTOR = await tl.EXECUTOR_ROLE();
  const PROPOSER = await tl.PROPOSER_ROLE();
  const ADMIN = await tl.DEFAULT_ADMIN_ROLE();

  console.log("EXECUTOR ANY:", await tl.hasRole(EXECUTOR, ANY));
  console.log("PROPOSER SAFE:", await tl.hasRole(PROPOSER, safe));
  console.log("ADMIN SAFE:", await tl.hasRole(ADMIN, safe));
}

main().catch((e) => { console.error(e); process.exit(1); });
