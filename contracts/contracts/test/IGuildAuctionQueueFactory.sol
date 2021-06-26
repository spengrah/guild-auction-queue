// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IGuildAuctionQueueFactory {
    function create(
        address _token,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minBid,
        uint256 _minShares
    ) external;
}
