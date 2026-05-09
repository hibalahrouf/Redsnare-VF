const { createPublicClient, http, parseAbi } = require('viem');

const CONTRACT_ADDRESS = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0';
const USER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const ABI = parseAbi([
    'function getBountyState(uint256) view returns (uint8, uint8, uint8, uint32, uint32, bool, uint256)',
    'function activeReports(uint256, address) view returns (uint256)'
]);

async function main() {
    const client = createPublicClient({
        chain: { id: 31337, name: 'Anvil' },
        transport: http('http://127.0.0.1:8545')
    });

    try {
        const state = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'getBountyState',
            args: [0n]
        });
        const maxActive = state[0];
        console.log(`Limite de rapports actifs autoriss : ${maxActive}`);

        const activeCount = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'activeReports',
            args: [0n, USER_ADDRESS]
        });
        console.log(`Vos rapports actuellement actifs : ${activeCount}`);

        if (Number(activeCount) >= Number(maxActive)) {
            console.log("ALERTE : Vous avez atteint la limite ! C'est pour a que la transaction échoue.");
        } else {
            console.log("La limite n'est pas atteinte. Le problme est ailleurs.");
        }

    } catch (e) {
        console.error("ERREUR:", e.message);
    }
}

main();
