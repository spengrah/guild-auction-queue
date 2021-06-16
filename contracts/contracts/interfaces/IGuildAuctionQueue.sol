// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IGuildAuctionQueue {
    function init(
        address token,
        address moloch,
        address destination,
        uint256 lockupPeriod,
        uint256 minShares
    ) external;

    function submitBid(uint256 amount, bytes32 details) external;

    function increaseBid(uint256 amount, uint256 id) external;

    function withdrawBid(uint256 amount, uint32 id) external;

    function cancelBid(uint256 id) external;

    function acceptBid(uint256 id) external;

    function isMember(address user) external view returns (bool);
}
