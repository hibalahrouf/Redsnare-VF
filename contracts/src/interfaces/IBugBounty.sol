// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBugBounty {
    enum ReportStatus {
        Submitted,
        Accepted,
        Rejected,
        Disputed,
        Finalized
    }

    struct Bounty {
        // Slot 1 (256 bits):
        address owner;              // 160 bits
        uint64 submissionDeadline;  // 64 bits
        uint32 reviewSLA;           // 32 bits
        
        // Slot 2 (248 bits):
        IERC20 token;               // 160 bits
        uint32 rateLimitWindow;     // 32 bits
        uint16 stakeEscalationBps;  // 16 bits
        uint8 maxInWindow;          // 8 bits
        uint8 maxActiveSubmissions; // 8 bits
        uint8 committeeSize;        // 8 bits
        uint8 thresholdK;           // 8 bits
        bool active;                // 8 bits
        
        uint32 disputeCommitSeconds;
        uint32 disputeRevealSeconds;

        // Unpacked Standard Defaults
        uint256 rewardAmount;
        uint256 stakeAmount;
        uint256 escrowBalance;
        uint256 appealBond;
        bytes32 metadataCidDigest; // Added for tags/desc
    }

    struct Report {
        // Slot 1 (256 bits):
        address researcher; // 160 bits
        uint64 submittedAt; // 64 bits
        bool paid;          // 8 bits
        ReportStatus status;// 8 bits
        uint8 acceptVotes;  // 8 bits
        uint8 rejectVotes;  // 8 bits
        
        bytes32 commitHash;
        bytes32 cidDigest;
        bytes32 hSteps;
        bytes32 hImpact;
        bytes32 hPoc;
        uint256 stakeAmount;
    }

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed owner,
        address indexed token,
        uint256 rewardAmount,
        uint256 stakeAmount,
        uint256 appealBond,
        uint64 submissionDeadline,
        uint8 committeeSize,
        uint8 thresholdK,
        string metadataCid
    );

    event BountyFunded(uint256 indexed bountyId, uint256 amount);
    event ReportCommitted(
        uint256 indexed bountyId,
        uint256 indexed reportId,
        address indexed researcher,
        bytes32 commitHash,
        bytes32 cidDigest,
        bytes32 hSteps,
        bytes32 hImpact,
        bytes32 hPoc,
        uint256 stakeAmount
    );
    event ReportAccepted(uint256 indexed bountyId, uint256 indexed reportId);
    event ReportRejected(uint256 indexed bountyId, uint256 indexed reportId);
    event ReportVoted(uint256 indexed bountyId, uint256 indexed reportId, address indexed reviewer, bool accepted);
    event ReportFinalized(uint256 indexed bountyId, uint256 indexed reportId, ReportStatus result);
    event DisputeOpened(uint256 indexed bountyId, uint256 indexed reportId, bool autoEscalated);
    event VoteCommitted(uint256 indexed bountyId, uint256 indexed reportId, address indexed reviewer);
    event VoteRevealed(uint256 indexed bountyId, uint256 indexed reportId, address indexed reviewer, bool vote);
    event DisputeFinalized(uint256 indexed bountyId, uint256 indexed reportId, ReportStatus outcome);

    error InvalidCommittee();
    error InvalidThreshold();
    error NotBountyOwner();
    error BountyInactive();
    error SubmissionClosed();
    error InsufficientEscrow();
    error NotCommitteeMember();
    error AlreadyVoted();
    error InvalidReport();
    error ReportNotSubmittable();
    error ReportNotFinalizable();
    error AlreadyPaid();
    error ReportNotDisputable();
    error NotAuthorized();
    error RateLimitExceeded();
    error DeadlinePassed();
    error SLANotExpired();
    error InvalidPhase();
}
