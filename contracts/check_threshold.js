const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const platformAbi = [
        "function getBountyState(uint256 bountyId) external view returns (uint8, uint8, uint8, uint32, uint32, bool, uint256)"
    ];
    const platform = new ethers.Contract("0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0", platformAbi, provider);
    const state = await platform.getBountyState(6);
    console.log("Threshold K:", state[2]); // thresholdK is the 3rd return value (index 2)
}

main().catch(console.error);
