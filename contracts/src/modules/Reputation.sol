// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Reputation {
    address public platform;

    struct UserReputation {
        uint256 acceptedReports;
        uint256 rejectedReports;
        uint256 disputesWon;
        uint256 disputesLost;
        int64 repScoreCached;
        uint64 lastUpdate;
    }

    struct OrganizationReputation {
        uint256 totalBounties;
        uint256 disputesLost;
        uint256 disputesWon;
        int16 trustScore;
        bool initialized; // FIX B4: explicit flag to distinguish 0-score from uninitialized
    }

    event ReputationPenalized(address indexed user, string reason);
    event TrustScoreUpdated(address indexed owner, int16 newScore);

    mapping(address => UserReputation) public reputations;
    mapping(address => OrganizationReputation) public orgReputations;

    error Unauthorized();

    modifier onlyPlatform() {
        if (msg.sender != platform) revert Unauthorized();
        _;
    }

    constructor() {
        platform = msg.sender;
    }

    function addAccepted(address user) external onlyPlatform {
        reputations[user].acceptedReports++;
        _updateRepScore(user, 3);
    }

    function addRejected(address user) external onlyPlatform {
        reputations[user].rejectedReports++;
        _updateRepScore(user, -2);
    }

    function addDisputeWon(address user) external onlyPlatform {
        reputations[user].disputesWon++;
        _updateRepScore(user, 2);
    }

    function addDisputeLost(address user) external onlyPlatform {
        reputations[user].disputesLost++;
        _updateRepScore(user, -3);
    }

    function penalizeNonReveal(address user) external onlyPlatform {
        _updateRepScore(user, -2);
        emit ReputationPenalized(user, "Failed to reveal vote");
    }

    function repScore(address user) public view returns (int64) {
        UserReputation storage r = reputations[user];
        if (r.lastUpdate == 0) return 0;
        
        int64 currentScore = r.repScoreCached;
        if (block.timestamp > r.lastUpdate) {
            uint256 dt = block.timestamp - r.lastUpdate;
            uint256 halfLives = dt / 90 days;
            if (halfLives > 0) {
                if (halfLives >= 64) {
                    currentScore = 0;
                } else {
                    currentScore = currentScore / int64(uint64(1) << uint64(halfLives));
                }
            }
        }
        return currentScore;
    }

    function _updateRepScore(address user, int64 delta) internal {
        reputations[user].repScoreCached = repScore(user) + delta;
        reputations[user].lastUpdate = uint64(block.timestamp);
    }

    // --- Organization Reputation Logic ---

    function initOrg(address owner) external onlyPlatform {
        OrganizationReputation storage org = orgReputations[owner];
        if (!org.initialized) {
            org.trustScore = 100; // FIX B4: Only set if not already initialized
            org.initialized = true;
        }
        org.totalBounties++;
    }

    function recordOrgDisputeOutcome(address owner, bool ownerWon) external onlyPlatform {
        OrganizationReputation storage org = orgReputations[owner];
        if (!org.initialized) {
            org.trustScore = 100;
            org.initialized = true;
        }

        if (ownerWon) {
            org.disputesWon++;
            org.trustScore += 5;
        } else {
            org.disputesLost++;
            org.trustScore -= 20;
        }

        if (org.trustScore > 200) org.trustScore = 200;
        if (org.trustScore < -100) org.trustScore = -100;

        emit TrustScoreUpdated(owner, org.trustScore);
    }

    // FIX B4: Unambiguous — if not initialized, returns base 100; otherwise returns real score
    function getTrustScore(address owner) public view returns (int16) {
        OrganizationReputation storage org = orgReputations[owner];
        if (!org.initialized) return 100;
        return org.trustScore;
    }
}
