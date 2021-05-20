// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "contracts/interfaces/IERC20.sol";
import "contracts/interfaces/IMOLOCH.sol";

contract AuctionQueue {
    IERC20 public token;
    IMOLOCH public moloch;
    uint256 public lockupPeriod; // number of seconds

    // -- Data Models --

    mapping(bytes32 => Bid) public bids; // externalId => bid

    struct Bid {
        uint256 amount;
        address submitter;
        bytes32 externalId;
        uint256 createdAt; // e.g. hire-us form id; must be unique
        bool active;
    }

    // -- Events --

    event NewBid(uint256 amount, bytes32 externalId, uint256 createdAt);
    event BidIncreased(uint256 newAmount, bytes32 externalId);
    event BidWithdrawn(uint256 newAmount, bytes32 externalId);
    event BidCanceled(bytes32 externalId);
    event BidFulfilled(address fulfilledBy, bytes32 externalId);

    // -- Functions --

    constructor(
        address _token,
        address _moloch,
        uint256 _lockupPeriod
    ) {
        token = IERC20(_token);
        moloch = IMOLOCH(_moloch);
        lockupPeriod = _lockupPeriod;
    }

    function submitBid(uint256 _amount, bytes32 _externalId) external {
        require(!bids[_externalId].active, "bid already exists");

        Bid storage bid = bids[_externalId];
        bid.amount = _amount;
        bid.submitter = msg.sender;

        uint256 timestamp = block.timestamp;

        bid.createdAt = timestamp;
        bid.active = true;

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit NewBid(_amount, _externalId, timestamp);
    }

    function increaseBid(uint256 _amount, bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.active, "bid inactive");
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
        require(bid.active, "bid inactive");
        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );
        require(bid.submitter == msg.sender, "must be submitter");

        _decreaseBid(_amount, bid); // QUESTION: need to be inside a require?

        require(token.transfer(msg.sender, _amount), "token transfer failed");

        emit BidWithdrawn(bid.amount, _externalId);
    }

    function cancelBid(bytes32 _externalId) external {
        Bid storage bid = bids[_externalId];
        require(bid.active, "bid inactive");
        require(
            (bid.createdAt + lockupPeriod) < block.timestamp,
            "lockupPeriod not over"
        );
        require(bid.submitter == msg.sender, "must be submitter");

        bid.active = false;

        _decreaseBid(bid.amount, bid); // QUESTION: need to be inside a require?

        emit BidCanceled(_externalId);
    }

    function fulfill(bytes32 _externalId) external memberOnly {
        Bid storage bid = bids[_externalId];
        require(bid.active, "bid inactive");

        bid.active = false;

        uint256 amount = bid.amount;
        bid.amount = 0;
        require(token.transfer(address(moloch), amount)); // QUESTION: should this go to the DAO or a minion, or somewhere else?

        emit BidFulfilled(msg.sender, _externalId);
    }

    // -- Internal Functions --

    function _decreaseBid(uint256 _amount, Bid storage bid) internal {
        require(bid.amount >= _amount, "existing bid amount too low");
        bid.amount -= _amount;
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
}
