// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../interfaces/IBugBounty.sol";

contract DisputeModule {
    address public platform;

    enum Phase {
        None,
        Commit,
        Reveal,
        Resolved
    }

    struct Dispute {
        uint256 bountyId;
        uint256 reportId;
        Phase phase;
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint8 acceptVotes;
        uint8 rejectVotes;
        address[] committers;
    }

    mapping(bytes32 => Dispute) public disputes;
    mapping(bytes32 => mapping(address => bytes32)) public commitments;
    mapping(bytes32 => mapping(address => bool)) public hasRevealed;

    error Unauthorized();
    error InvalidPhase();
    error DeadlinePassed();
    error CommitNotMatching();
    error AlreadyCommitted();
    error AlreadyRevealed();

    function getDisputeKey(uint256 bountyId, uint256 reportId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(bountyId, reportId));
    }

    modifier onlyPlatform() {
        if (msg.sender != platform) revert Unauthorized();
        _;
    }

    constructor() {
        platform = msg.sender;
    }

    function raiseDispute(uint256 bountyId, uint256 reportId, uint32 commitSeconds, uint32 revealSeconds) external onlyPlatform {
        bytes32 key = getDisputeKey(bountyId, reportId);
        disputes[key].bountyId = bountyId;
        disputes[key].reportId = reportId;
        disputes[key].phase = Phase.Commit;
        disputes[key].commitDeadline = uint64(block.timestamp + commitSeconds);
        disputes[key].revealDeadline = uint64(block.timestamp + commitSeconds + revealSeconds);
        disputes[key].acceptVotes = 0;
        disputes[key].rejectVotes = 0;
    }

    function commitVote(uint256 bountyId, uint256 reportId, address committeeMember, bytes32 commitHash) external onlyPlatform {
        bytes32 key = getDisputeKey(bountyId, reportId);
        Dispute storage d = disputes[key];
        if (d.phase != Phase.Commit) revert InvalidPhase();
        if (block.timestamp > d.commitDeadline) revert DeadlinePassed();
        if (commitments[key][committeeMember] != bytes32(0)) revert AlreadyCommitted();

        commitments[key][committeeMember] = commitHash;
        d.committers.push(committeeMember);
    }

    function revealVote(uint256 bountyId, uint256 reportId, address committeeMember, bool vote, string calldata salt) external onlyPlatform {
        bytes32 key = getDisputeKey(bountyId, reportId);
        Dispute storage d = disputes[key];
        // Transition to reveal phase if deadline passed
        if (d.phase == Phase.Commit && block.timestamp > d.commitDeadline) {
            d.phase = Phase.Reveal;
        }
        if (d.phase != Phase.Reveal) revert InvalidPhase();
        if (block.timestamp > d.revealDeadline) revert DeadlinePassed();
        if (hasRevealed[key][committeeMember]) revert AlreadyRevealed();

        bytes32 expectedCommit = keccak256(abi.encodePacked(vote, salt));
        if (expectedCommit != commitments[key][committeeMember]) revert CommitNotMatching();

        hasRevealed[key][committeeMember] = true;
        if (vote) {
            d.acceptVotes++;
        } else {
            d.rejectVotes++;
        }
    }

    function resolveDispute(uint256 bountyId, uint256 reportId, uint8 thresholdK) external onlyPlatform returns (IBugBounty.ReportStatus outcome, address[] memory nonRevealers) {
        bytes32 key = getDisputeKey(bountyId, reportId);
        Dispute storage d = disputes[key];
        
        if (d.phase == Phase.Commit && block.timestamp > d.commitDeadline) {
            d.phase = Phase.Reveal;
        }
        
        bool thresholdReached = (d.acceptVotes >= thresholdK || d.rejectVotes >= thresholdK);
        bool revealPassed = (block.timestamp > d.revealDeadline);
        
        if (!thresholdReached && !revealPassed) revert InvalidPhase();
        
        d.phase = Phase.Resolved;

        // Find non-revealers (committed but didn't reveal)
        uint256 nrCount = 0;
        for (uint256 i = 0; i < d.committers.length; i++) {
            if (!hasRevealed[key][d.committers[i]]) {
                nrCount++;
            }
        }
        nonRevealers = new address[](nrCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < d.committers.length; i++) {
            if (!hasRevealed[key][d.committers[i]]) {
                nonRevealers[idx++] = d.committers[i];
            }
        }

        if (d.acceptVotes >= thresholdK) {
            return (IBugBounty.ReportStatus.Accepted, nonRevealers);
        } else if (d.rejectVotes >= thresholdK) {
            return (IBugBounty.ReportStatus.Rejected, nonRevealers);
        } else {
            // FIX B3: Tie → benefit of the doubt to the researcher (Accepted).
            // Anti-spam is handled by the stake mechanism, not by defaulting to rejection.
            return (IBugBounty.ReportStatus.Accepted, nonRevealers);
        }
    }
}
