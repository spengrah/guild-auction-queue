// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IGuildAuctionQueueFactory.sol";

contract TestMinion {
    address public moloch;
    IGuildAuctionQueueFactory private factory;

    constructor(address _moloch, address _factory) {
        moloch = _moloch;
        factory = IGuildAuctionQueueFactory(_factory);
    }

    function create(
        address _token,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minBid,
        uint256 _minShares
    ) external {
        //

        factory.create(
            _token,
            _destination,
            _lockupPeriod,
            _minBid,
            _minShares
        );
    }
}
