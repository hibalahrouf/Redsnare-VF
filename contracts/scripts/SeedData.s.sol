// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BugBountyPlatform.sol";
import "../src/MockUSDC.sol";
import "../src/modules/Reputation.sol";

contract SeedData is Script {
    BugBountyPlatform platform;
    MockUSDC usdc;

    address admin = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address r1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address r2 = 0x3c44cDDDb2A900a37625126015bE141030081401;
    address r3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    function run() external {
        platform = BugBountyPlatform(vm.parseAddress("0x959922be3caee4b8cd9a407cc3ac1c251c2007b1"));
        usdc = MockUSDC(vm.parseAddress("0x0b306bf915c4d645ff596e518faf3f9669b97016"));

        uint256 pk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(pk);

        // 1. Mint USDC to Admin
        usdc.mint(admin, 1_000_000 * 1e6);
        usdc.approve(address(platform), type(uint256).max);

        // 2. Create a dummy bounty to give reputation to researchers
        address[] memory tempCommittee = new address[](1);
        tempCommittee[0] = admin;

        uint256 dummyBountyId = platform.createBounty(
            address(usdc),
            100 * 1e6, 
            0, 
            0, 
            uint64(block.timestamp + 1 days),
            1 days, 
            1 hours, 
            100, 
            100, 
            100, 
            tempCommittee,
            1, 
            1 hours,
            1 hours,
            "dummy_metadata",
            1000 * 1e6 
        );

        vm.stopBroadcast();
        
        uint256 r1_pk = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        uint256 r2_pk = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
        uint256 r3_pk = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;

        address[] memory researchers = new address[](3);
        researchers[0] = r1; researchers[1] = r2; researchers[2] = r3;
        uint256[] memory pks = new uint256[](3);
        pks[0] = r1_pk; pks[1] = r2_pk; pks[2] = r3_pk;

        for (uint i = 0; i < 3; i++) {
            vm.startBroadcast(pks[i]);
            platform.submitReport(dummyBountyId, bytes32(uint256(i+1)), bytes32(uint256(i+1)), bytes32(uint256(i+1)), bytes32(uint256(i+1)), bytes32(uint256(i+1)));
            vm.stopBroadcast();
        }

        vm.startBroadcast(pk);
        for (uint i = 0; i < 3; i++) {
            platform.voteReport(dummyBountyId, i, true);
            platform.finalizeReport(dummyBountyId, i);
        }

        // 5. Now create the 2 real bounties
        address[] memory committee = new address[](3);
        committee[0] = r1; committee[1] = r2; committee[2] = r3;

        platform.createBounty(
            address(usdc),
            5000 * 1e6,
            50 * 1e6,
            100 * 1e6,
            uint64(block.timestamp + 30 days),
            3 * 86400,
            48 * 3600,
            1000,
            2,
            1,
            committee,
            2,
            3 * 86400,
            6 * 86400,
            "QmZ_DeFi_Security",
            10000 * 1e6
        );

        platform.createBounty(
            address(usdc),
            2500 * 1e6,
            25 * 1e6,
            50 * 1e6,
            uint64(block.timestamp + 15 days),
            2 * 86400,
            24 * 3600,
            500,
            5,
            2,
            committee,
            2,
            2 * 86400,
            4 * 86400,
            "QmY_Web3_Infra",
            5000 * 1e6
        );

        vm.stopBroadcast();
    }
}
