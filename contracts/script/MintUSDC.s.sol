// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MintUSDCScript is Script {
    function run() external {
        address mockUSDC   = vm.envAddress("MOCK_USDC_ADDRESS");
        address recipient  = vm.envAddress("RECIPIENT_ADDRESS");
        uint256 amount     = vm.envOr("MINT_AMOUNT", uint256(100_000 * 1e6)); // default 100,000 USDC
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));

        console.log("Minting", amount / 1e6, "mUSDC to", recipient);
        console.log("MockUSDC contract:", mockUSDC);

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        console.log("Broadcaster (msg.sender):", msg.sender);
        console.log("MockUSDC Owner:", MockUSDC(mockUSDC).owner());

        MockUSDC(mockUSDC).mint(recipient, amount);
        vm.stopBroadcast();

        console.log("Done. Balance should now be", amount / 1e6, "mUSDC");
    }
}
