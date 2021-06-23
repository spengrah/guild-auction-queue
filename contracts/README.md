# GuildAuctionQueue

A queue ordered by token bidding, designed for DAOs ("Guilds") offering services to the public.

## Usage

### Deployment
Guilds can deploy a new `GuildAuctionQueue` (or `Queue` for short) instance via the `GuildAuctionQueueFactory`. A Guild can set the following parameters for their `Queue`:

- `token` -- the ERC20-compatible token in which bids will be denominated
- `destination` -- the address where tokens from accepted bids will be sent (eg the Guild itself or perhaps one of its Minions)
- `lockupPeriod` -- the length of time (in seconds) before a bid can be withdrawn (ie decreased) or cancelled by its submitter
- `minMid` -- the minimum number of tokens that can be bid (can be zero)
- `minShares` -- the minimum number of Moloch DAO shares required to accept an existing bid
    - if set to 0, the only address that can accept existing bids is the Guild itself

Note: the factory uses OpenZeppelin's [implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/proxy) of the EIP-1167 minimal proxy ("clone") factory pattern for gas-efficient deployment.

### Submitting a bid
``` javascript
function submitBid(uint256 amount, bytes32 details) external returns (uint256);
```
Once a `Queue` is deployed, anybody can submit a new bid with the following parameters.
- `amount` -- the number of tokens for the bid, which will be transferred from the submitter to the `Queue` contract
- `details`-- an optional bytes32 field for additional context, which will be emitted in the `NewBid` event and not held in contract storage.

### Increasing a bid
``` javascript
function increaseBid(uint256 amount, uint256 id) external;
```
Once a bid has been submitted, the submitter* can choose to increase the bid amount. They may want to do this, for example, because higher bids have since come in with which they want to compete.
- `amount` -- the number of tokens to add to the existing bid amount
- `id` -- the id of the bid to increase

*In reality, anybody can increase the amount for any existing bid as long as they have enough tokens.

### Withdrawing (decreasing) a bid
``` javascript
function withdrawBid(uint256 amount, uint32 id) external;
```
Once the `lockupPeriod` has passed, the submitter of a bid can choose to withdraw some of their tokens from the bid, thus decreasing their bid's amount. The resulting new bid amount must not be lower than the `minBid`.
- `amount` -- the number of tokens to withdraw
- `id` -- the id of the bid to withdraw from

### Canceling a bid
``` javascript
function cancelBid(uint256 id) external;
```
Once the `lockupPeriod` has passed, the submitter of a bid can also choose to cancel their bid completely and receive back all their tokens from that bid.
- `id` -- the id of the bid to cancel

### Accepting a bid
``` javascript
function acceptBid(uint256 id) external;
```
Once a bid has been submitted, an eligible accepter can accept it at any time. Accepting a bid closes it out and transfers the bid's tokens to the `destination`.
- `id` -- the id of the bid to accept

### Changing the minimum bid
``` javascript
function changeMinBid(uint256 amount) external;
```
The owner (the Guild) can change the `minBid` at any time.
- `amount` -- the amount of tokens for the new minimum bid

New `minBid`s do not impact existing bids. For example, if an existing bid (call it Benjamin Bid) is for `100` tokens and then the `minBid` is changed from `50` to `150` tokens, Benjamin Bid is still valid. 

A submitter decreasing their bid will need to ensure that their new bid amount exceeds the `minBid`, even if the `minBid` has been changed since they originally submmitted.




## Deployments

### Rinkeby

- **Implementation** contract: [0xC2C892BDa73905fDb5d7806018225c9151D6752F](https://rinkeby.etherscan.io/address/0xC2C892BDa73905fDb5d7806018225c9151D6752F#code)

- **Factory** contract: [0x3e9886fD8BD12A237468826094f85FB6bbb4B1A1](https://rinkeby.etherscan.io/address/0x3e9886fD8BD12A237468826094f85FB6bbb4B1A1#code)

## Local Development

#### Install dependencies

`yarn`

#### Compile contracts

`yarn hardhat compile`

#### Run tests

`yarn hardhat test`

Note: this repo uses the [hardhat-gas-reporter](https://hardhat.org/plugins/hardhat-gas-reporter.html) plugin, which measures and reports on gas spent on contract funtions during tests.

#### Deploy
This repo uses the [hardhat-deploy](https://hardhat.org/plugins/hardhat-deploy.html) plugin, which adds a `deploy` task to hardhat.

`yarn hardhat deploy`
