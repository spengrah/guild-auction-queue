// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IGuildAuctionQueue.sol";

contract GuildAuctionQueueFactory {
    address public immutable implementation;

    constructor(address _implementation) {
        require(_implementation != address(0), "invalid implementation");

        implementation = _implementation;
    }

    function create(
        address _token,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minBid,
        uint256 _minShares
    ) external returns (address) {
        //
        address queueAddress = Clones.clone(implementation);

        IGuildAuctionQueue(queueAddress).init(
            msg.sender, // msg.sender becomes the owner
            _token,
            _destination,
            _lockupPeriod,
            _minBid,
            _minShares
        );

        emit NewQueue(
            queueAddress,
            msg.sender,
            _token,
            _destination,
            _lockupPeriod,
            _minBid,
            _minShares
        );

        return queueAddress;
    }

    // Event

    event NewQueue(
        address queueAddress,
        address owner,
        address token,
        address destination,
        uint256 lockupPeriod,
        uint256 minBid,
        uint256 minShares
    );
}
