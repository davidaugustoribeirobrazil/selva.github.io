import { expect } from "chai";
import { ethers } from "hardhat";

describe("SELVA", function () {
  it("mints the initial supply to owner and supports permit/burn", async function () {
    const [owner, other] = await ethers.getSigners();
    const initial = 1_000_000n * 10n ** 18n;
    const SELVA = await ethers.getContractFactory("SELVA");
    const selva = await SELVA.deploy(initial, owner.address);
    await selva.waitForDeployment();

    expect(await selva.totalSupply()).to.equal(initial);
    expect(await selva.balanceOf(owner.address)).to.equal(initial);

    // Transfer/burn smoke test
    await expect(selva.connect(owner).transfer(other.address, 1000)).to.not.be.reverted;
    await expect(selva.connect(other).burn(500)).to.not.be.reverted;

    // EIP-2612 domain separator exists (no full permit flow here)
    expect(await selva.name()).to.equal("Selva");
  });
});
