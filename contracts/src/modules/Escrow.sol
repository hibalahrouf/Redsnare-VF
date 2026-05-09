// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Escrow {
    using SafeERC20 for IERC20;

    address public platform;
    
    // bountyId => locked amount
    mapping(uint256 => uint256) public balances;

    error Unauthorized();
    error InsufficientBalance();

    modifier onlyPlatform() {
        if (msg.sender != platform) revert Unauthorized();
        _;
    }

    constructor() {
        platform = msg.sender; // The platform deploys the Escrow
    }

    function deposit(uint256 bountyId, uint256 amount) external onlyPlatform {
        balances[bountyId] += amount;
    }

    function release(uint256 bountyId, IERC20 token, address to, uint256 amount) external onlyPlatform {
        if (balances[bountyId] < amount) revert InsufficientBalance();
        balances[bountyId] -= amount;
        token.safeTransfer(to, amount);
    }
}
