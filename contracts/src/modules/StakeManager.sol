// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakeManager {
    using SafeERC20 for IERC20;
    address public platform;
    address public treasury;

    // reportId => staked amount
    mapping(uint256 => uint256) public stakes;

    error Unauthorized();

    modifier onlyPlatform() {
        if (msg.sender != platform) revert Unauthorized();
        _;
    }

    constructor(address _treasury) {
        platform = msg.sender;
        treasury = _treasury;
    }

    function lockStake(uint256 reportId, IERC20 token, uint256 amount, address from) external onlyPlatform {
        if (amount > 0) {
            token.safeTransferFrom(from, address(this), amount);
            stakes[reportId] = amount;
        }
    }

    function refundStake(uint256 reportId, IERC20 token, address to) external onlyPlatform {
        uint256 amount = stakes[reportId];
        if (amount > 0) {
            stakes[reportId] = 0;
            token.safeTransfer(to, amount);
        }
    }

    function slashStake(uint256 reportId, IERC20 token) external onlyPlatform {
        uint256 amount = stakes[reportId];
        if (amount > 0) {
            stakes[reportId] = 0;
            token.safeTransfer(treasury, amount);
        }
    }
}
