import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EnigmaRelics with account:", deployer.address);

  const EnigmaRelics = await ethers.getContractFactory("EnigmaRelics");
  const relics = await EnigmaRelics.deploy(deployer.address);
  await relics.waitForDeployment();

  console.log("EnigmaRelics deployed to:", await relics.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
