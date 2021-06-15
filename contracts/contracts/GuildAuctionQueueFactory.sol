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
        uint256 _lockupPeriod
    ) external returns (address) {
        //
        address queueAddress = Clones.clone(implementation);

        _init(queueAddress, _token, _moloch, _destination, _lockupPeriod);

        return queueAddress;
    }

    function createDeterministic(
        address _token,
        address _moloch,
        address _destination,
        uint256 _lockupPeriod,
        bytes32 _salt
    ) external returns (address) {
        //
        address queueAddress = Clones.cloneDeterministic(implementation, _salt);

        _init(queueAddress, _token, _moloch, _destination, _lockupPeriod);

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
        uint256 _lockupPeriod
    ) internal {
        IGuildAuctionQueue(_queueAddress).init(
            _token,
            _moloch,
            _destination,
            _lockupPeriod
        );

        emit NewQueue(_queueAddress, _token, _moloch, _destination);
    }

    // Event

    event NewQueue(
        address queueAddress,
        address token,
        address moloch,
        address destination
    );
}
