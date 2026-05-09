// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BugBountyPlatform} from "../src/BugBountyPlatform.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ERC2771Forwarder} from "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

contract DeployScript is Script {
    function run() external {
        // Use env vars if set, otherwise use Anvil defaults for local testing
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address treasury = vm.envOr("TREASURY_ADDRESS", address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy ERC2771 Forwarder for meta-transactions
        ERC2771Forwarder forwarder = new ERC2771Forwarder("BugBountyForwarder");

        MockUSDC usdc = new MockUSDC(msg.sender);
        BugBountyPlatform platform = new BugBountyPlatform(treasury, address(forwarder));

        vm.stopBroadcast();
    }
}
