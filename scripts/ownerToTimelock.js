const { ethers } = require("hardhat");

// PREENCHA com o endereço do seu token SELVA
const SELVA = "0x5bD472E9c0fE7A6986Bc8E661BBc092f716133f2";

// PREENCHA com o endereço do timelock
const TIMELOCK = "0x61D2C8739F32D34A574416B0803cEFAc3E845ccd";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Operator:", signer.address);

  const selva = await ethers.getContractAt("SELVA", SELVA);
  console.log("Current owner:", await selva.owner());

  const tx = await selva.transferOwnership(TIMELOCK);
  console.log("transferOwnership tx:", tx.hash);
  await tx.wait();

  console.log("New owner:", await selva.owner());
  console.log("Pronto: o Timelock agora é o owner do SELVA.");
}

main().catch((e) => { console.error(e); process.exit(1); });
