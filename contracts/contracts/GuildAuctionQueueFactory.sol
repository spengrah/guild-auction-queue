// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./oz/Clones.sol";
import "./interfaces/IGuildAuctionQueue.sol";

contract GuildAuctionQueueFactory {
    address public immutable implementation;

    constructor(address _implementation) {
        require(_implementation != address(0), "invalid implementation");

        implementation = _implementation;
    }

    function create(
        address _token,
        address _moloch,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minShares
    ) external returns (address) {
        //
        address queueAddress = Clones.clone(implementation);

        _init(
            queueAddress,
            _token,
            _moloch,
            _destination,
            _lockupPeriod,
            _minShares
        );

        return queueAddress;
    }

    function createDeterministic(
        address _token,
        address _moloch,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minShares,
        bytes32 _salt
    ) external returns (address) {
        //
        address queueAddress = Clones.cloneDeterministic(implementation, _salt);

        _init(
            queueAddress,
            _token,
            _moloch,
            _destination,
            _lockupPeriod,
            _minShares
        );

        return queueAddress;
    }

    function predictDeterministicAddress(bytes32 _salt)
        external
        view
        returns (address)
    {
        return Clones.predictDeterministicAddress(implementation, _salt);
    }

    function _init(
        address _queueAddress,
        address _token,
        address _moloch,
        address _destination,
        uint256 _lockupPeriod,
        uint256 _minShares
    ) internal {
        IGuildAuctionQueue(_queueAddress).init(
            _token,
            _moloch,
            _destination,
            _lockupPeriod,
            _minShares
        );

        emit NewQueue(
            _queueAddress,
            _token,
            _moloch,
            _destination,
            _lockupPeriod,
            _minShares
        );
    }

    // Event

    event NewQueue(
        address queueAddress,
        address token,
        address moloch,
        address destination,
        uint256 lockupPeriod,
        uint256 minShares
    );
}
