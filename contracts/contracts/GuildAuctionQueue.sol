// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMOLOCH.sol";
import "./interfaces/IMinion.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract GuildAuctionQueue is ReentrancyGuard, Initializable {
    IERC20 public token;
    address public owner; // typically a dao's minion
    address public destination; // where tokens go when bids are accepted
    uint256 public lockupPeriod; // period for which bids are locked and cannot be withdrawn, in seconds
    uint256 public minBid; // adjustable by the owner

    uint256 public membersCanAccept; // whether moloch members can accept bids individually, or if the owner must do so (eg with a minion proposal)
    uint256 public minShares; // the number of moloch shares a member must have to be eligible to accept a bid; only set if memberCanAccept == 1

    uint256 public newBidId; // the id of the next bid to be submitted; starts at 0

    // -- Data Models --

    mapping(uint256 => Bid) public bids;

    enum BidStatus {queued, accepted, cancelled}

    struct Bid {
        uint256 amount;
        address submitter;
        uint256 createdAt; // block.timestamp from tx when bid was created
        BidStatus status;
    }

    // -- Functions --

    function init(
        address _owner,
        address _token,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minBid,
        uint256 _minShares
    ) external initializer {
        require(_token != address(0), "invalid token");
        require(_destination != address(0), "invalid destination");

        if (_minShares > 0) {
            minShares = _minShares;
            membersCanAccept = 1;
        }
        // else: solidity uints default to 0 so no need to explicitly set minShares or membersCanAccept to 0

        token = IERC20(_token);
        destination = _destination;
        lockupPeriod = _lockupPeriod;
        minBid = _minBid;
        owner = _owner;
    }

    function submitBid(uint256 _amount, bytes32 _details)
        external
        nonReentrant
    {
        require(_amount >= minBid, "bid too low");

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        Bid storage bid = bids[newBidId];

        bid.amount = _amount;
        bid.submitter = msg.sender;
        bid.status = BidStatus.queued;

        bid.createdAt = block.timestamp;
        uint256 id = newBidId;
        newBidId++;

        emit NewBid(_amount, msg.sender, id, _details);
    }

    function increaseBid(uint256 _amount, uint256 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        bid.amount += _amount;

        emit BidIncreased(bid.amount, _id);
    }

    function withdrawBid(uint256 _amount, uint32 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        require(bid.submitter == msg.sender, "!submitter");
        require(bid.amount - _amount >= minBid, "remaining bid too low");

        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );

        bid.amount -= _amount; // reverts on underflow

        require(token.transfer(msg.sender, _amount), "token transfer failed");

        emit BidWithdrawn(bid.amount, _id);
    }

    function cancelBid(uint256 _id) external nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        require(bid.submitter == msg.sender, "!submitter");

        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );

        bid.status = BidStatus.cancelled;

        require(token.transfer(msg.sender, bid.amount));

        emit BidCanceled(_id);
    }

    function acceptBid(uint256 _id) external accepterOnly nonReentrant {
        require(_id < newBidId, "invalid bid");
        Bid storage bid = bids[_id];
        require(bid.status == BidStatus.queued, "bid inactive");

        bid.status = BidStatus.accepted;

        require(token.transfer(destination, bid.amount));

        emit BidAccepted(msg.sender, _id);
    }

    // -- Helper Functions --

    function isMember(address user) public view returns (bool) {
        // if owner is a minion, fetch its moloch parent
        IMinion maybeMinion = IMinion(owner);
        address molochAddress = maybeMinion.moloch(); // reverts if owner doesn't have a moloch getter

        IMOLOCH moloch = IMOLOCH(molochAddress);
        address member = moloch.memberAddressByDelegateKey(user);
        (, uint256 shares, , , , ) = moloch.members(member);
        return shares >= minShares;
    }

    // -- Modifiers --
    modifier accepterOnly() {
        if (membersCanAccept == 1) {
            require(isMember(msg.sender), "!full moloch member");
        } else {
            require(msg.sender == owner, "!owner");
        }

        _;
    }

    // -- Events --

    event NewBid(
        uint256 amount,
        address submitter,
        uint256 id,
        bytes32 details
    );
    event BidIncreased(uint256 newAmount, uint256 id);
    event BidWithdrawn(uint256 newAmount, uint256 id);
    event BidCanceled(uint256 id);
    event BidAccepted(address acceptedBy, uint256 id);
}
