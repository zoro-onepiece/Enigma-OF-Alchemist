import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const ARBITRUM_SEPOLIA_RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      // OpenZeppelin 5.6.1's Bytes.sol uses `mcopy` (the Cancun-hardfork
      // MCOPY opcode) in inline assembly. solc 0.8.24 supports emitting it,
      // but its default EVM version target is still "shanghai" (pre-mcopy),
      // so compilation fails with "Function mcopy not found" unless the
      // target is bumped explicitly. Arbitrum (One and Sepolia) completed
      // its Cancun-equivalent ArbOS upgrade, so this is safe to deploy.
      evmVersion: "cancun",
    },
  },
  paths: {
    // Renamed from the Hardhat default ("./artifacts") to avoid nesting a
    // second "artifacts" folder inside this monorepo's own artifacts/contracts
    // directory.
    artifacts: "./build",
    cache: "./cache",
  },
  networks: {
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 421614,
    },
  },
};

export default config;
