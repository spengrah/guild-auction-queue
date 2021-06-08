// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "contracts/interfaces/IERC20.sol";
import "contracts/interfaces/IMOLOCH.sol";
import "contracts/ReentrancyGuard.sol";

contract GuildAuctionQueue is ReentrancyGuard {
    IERC20 public token;
    IMOLOCH public moloch;
    address public destination; // where tokens go when bids are accepted
    uint256 public lockupPeriod; // period for which bids are locked and cannot be withdrawn, in seconds
    uint256 public newBidId; // the id of the next bid to be submitted; starts at 0

    // -- Data Models --

    mapping(uint256 => Bid) public bids;

    enum BidStatus {queued, accepted, cancelled}

    struct Bid {
        uint256 amount;
        address submitter;
        uint256 createdAt; // block.timestamp from tx when bid was created
        bytes32 details; // details of bid, eg an IPFS hash
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

    function submitBid(uint256 _amount, bytes32 _details)
        external
        nonReentrant
    {
        Bid storage bid = bids[newBidId];

        bid.amount = _amount;
        bid.submitter = msg.sender;
        bid.details = _details;
        bid.status = BidStatus.queued;

        uint256 timestamp = block.timestamp;
        bid.createdAt = timestamp;
        uint256 id = newBidId;
        newBidId++;

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit NewBid(_amount, msg.sender, id, _details, timestamp);
    }

    function increaseBid(uint256 _amount, uint256 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");
        require(bid.submitter == msg.sender, "must be submitter");
        bid.amount += _amount;

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit BidIncreased(bid.amount, _id);
    }

    function withdrawBid(uint256 _amount, uint32 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        require(bid.submitter == msg.sender, "must be submitter");

        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );

        _decreaseBid(_amount, bid);

        require(token.transfer(msg.sender, _amount), "token transfer failed");

        emit BidWithdrawn(bid.amount, _id);
    }

    function cancelBid(uint256 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        require(bid.submitter == msg.sender, "must be submitter");

        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );

        bid.status = BidStatus.cancelled;

        require(token.transfer(msg.sender, bid.amount));

        emit BidCanceled(_id);
    }

    function acceptBid(uint256 _id) external memberOnly nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        bid.status = BidStatus.accepted;

        uint256 amount = bid.amount;
        bid.amount = 0;
        require(token.transfer(destination, amount));

        emit BidAccepted(msg.sender, _id);
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

    event NewBid(
        uint256 amount,
        address submitter,
        uint256 id,
        bytes32 details,
        uint256 createdAt
    );
    event BidIncreased(uint256 newAmount, uint256 id);
    event BidWithdrawn(uint256 newAmount, uint256 id);
    event BidCanceled(uint256 id);
    event BidAccepted(address acceptedBy, uint256 id);
}
