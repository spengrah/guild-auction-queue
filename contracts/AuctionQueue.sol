// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "contracts/interfaces/IERC20.sol";
import "contracts/interfaces/IMOLOCH.sol";

contract AuctionQueue {
    IERC20 public token;
    IMOLOCH public moloch;
    address public destination; // where tokens go when bids are accepted
    uint256 public lockupPeriod; // period for which bids are locked and cannot be withdrawn, in seconds

    // -- Data Models --

    mapping(bytes32 => Bid) public bids; // externalId => bid

    enum BidStatus {null, queued, accepted, cancelled}
    struct Bid {
        uint256 amount;
        address submitter;
        bytes32 externalId; // e.g. hire-us form id; must be unique
        uint256 createdAt; // block.timestamp from tx when bid was created
        BidStatus status;
    }

    // -- Functions --

    constructor(
        address _token,
        address _moloch,
        address _destination,
        uint256 _lockupPeriod
    ) {
        token = IERC20(_token);
        moloch = IMOLOCH(_moloch);
        destination = _destination;
        lockupPeriod = _lockupPeriod;
    }

    function submitBid(uint256 _amount, bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.status == BidStatus.null, "bid already exists");

        bid.amount = _amount;
        bid.submitter = msg.sender;

        uint256 timestamp = block.timestamp;

        bid.createdAt = timestamp;
        bid.status = BidStatus.queued;

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit NewBid(_amount, _externalId, timestamp);
    }

    function increaseBid(uint256 _amount, bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.status == BidStatus.queued, "bid inactive");
        require(bid.submitter == msg.sender, "must be submitter");
        bid.amount += _amount;

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit BidIncreased(bid.amount, _externalId);
    }

    function withdrawBid(uint256 _amount, bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.status == BidStatus.queued, "bid inactive");
        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );
        require(bid.submitter == msg.sender, "must be submitter");

        require(_decreaseBid(_amount, bid), "bid decreased failed");

        require(token.transfer(msg.sender, _amount), "token transfer failed");

        emit BidWithdrawn(bid.amount, _externalId);
    }

    function cancelBid(bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.status == BidStatus.queued, "bid inactive");
        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );
        require(bid.submitter == msg.sender, "must be submitter");

        bid.status = BidStatus.cancelled;

        require(_decreaseBid(bid.amount, bid), "bid decrease failed");

        emit BidCanceled(_externalId);
    }

    function acceptBid(bytes32 _externalId) external memberOnly {
        Bid storage bid = bids[_externalId];
        require(bid.status == BidStatus.queued, "bid inactive");

        bid.status = BidStatus.accepted;

        uint256 amount = bid.amount;
        bid.amount = 0;
        require(token.transfer(destination, amount));

        emit BidAccepted(msg.sender, _externalId);
    }

    // -- Internal Functions --

    function _decreaseBid(uint256 _amount, Bid storage _bid)
        internal
        returns (bool)
    {
        _bid.amount -= _amount; // reverts on underflow (ie if _amount > _bid.amount)
        return true;
    }

    // -- Helper Functions --

    function isMember(address user) public view returns (bool) {
        (, uint256 shares, , , , ) = moloch.members(user);
        return shares > 0;
    }

    // -- Modifiers --
    modifier memberOnly() {
        require(isMember(msg.sender), "not member of moloch");
        _;
    }

    // -- Events --

    event NewBid(uint256 amount, bytes32 externalId, uint256 createdAt);
    event BidIncreased(uint256 newAmount, bytes32 externalId);
    event BidWithdrawn(uint256 newAmount, bytes32 externalId);
    event BidCanceled(bytes32 externalId);
    event BidAccepted(address acceptedBy, bytes32 externalId);
}
