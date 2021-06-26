const { expect, use } = require('chai');
const { ethers, waffle, deployments, getChainId } = require('hardhat');
const { solidity } = waffle;
const { BigNumber, getContract, getSigners } = ethers;
// const { get } = deployments;
const { membersCanAccept } = require('../deploy/args.json');

use(solidity);

async function setup(bidder) {
	await deployments.fixture(['queue']);
	const auctionQueue = await getContract('queue');
	const token = await getContract('TestERC20');

	const queue_bidder = auctionQueue.connect(bidder);
	await token.setBalance(bidder.address, 100);
	const token_bidder = token.connect(bidder);
	await token_bidder.approve(queue_bidder.address, 100);

	return [
		auctionQueue,
		queue_bidder,
		token,
		token_bidder
	];
}

const DETAILS =
	'0x1000000000000000000000000000000000000000000000000000000000000000';

describe('GuildAuctionQueue', () => {
	let bidder, accepter, otherWallet, destination; // wallets
	let token, moloch, auctionQueue; // deployed contracts
	let queue_bidder, queue_other, queue_accepter, token_bidder, token_other // signer-connected contracts
	let lockup;

	before(async () => {
		[deployer, bidder, accepter, destination, otherWallet] =
			await getSigners();

		lockup = membersCanAccept.lockupPeriod[await getChainId()];
	});

	describe('init', () => {
		it('cannot be called multiple times', async () => {
			[ auctionQueue, token ] = await setup(bidder);

			receipt = auctionQueue.init(
				token.address,
				deployer.address, // owner
				destination.address,
				lockup,
				10, // minBid
				1 // minShares
			);

			await expect(receipt).to.be.revertedWith(
				'Initializable: contract is already initialized'
			);
		});
	});

	describe('submitBid', () => {
		beforeEach(async () => {
			[ auctionQueue, queue_bidder, token, token_bidder ] = await setup(bidder);
		});
		it('creates new Bid', async () => {
			receipt = await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

			block = await bidder.provider.getBlock(receipt.blockNumber);
			time = block.timestamp;

			bid = await auctionQueue.bids(0);

			expect(bid.amount).to.equal(BigNumber.from(75));
			expect(bid.submitter).to.equal(bidder.address);
			expect(bid.createdAt).to.equal(time);
			expect(bid.status).to.equal(0);
			expect(await auctionQueue.newBidId()).to.equal(1);
		});

		it('transfers correct tokens', async () => {
			await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			expect(await token.balanceOf(auctionQueue.address)).to.equal(
				BigNumber.from(75)
			);
			expect(await token.balanceOf(bidder.address)).to.equal(
				BigNumber.from(25)
			);
		});

		it('emits NewBid event', async () => {
			receipt = await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

			expect(receipt)
				.to.emit(queue_bidder, 'NewBid')
				.withArgs(BigNumber.from(75), bidder.address, 0, DETAILS);
		});
	});

	describe('increaseBid', () => {
		let receipt;

		describe(':)', () => {
			beforeEach(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
				receipt = await queue_bidder.increaseBid(BigNumber.from(20), 0);
			});

			it('increases bid amount correctly', async () => {
				bid = await auctionQueue.bids(0);

				expect(bid.amount).to.equal(BigNumber.from(95));
			});

			it('transfers correct tokens', async () => {
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(95)
				);
				expect(await token.balanceOf(bidder.address)).to.equal(
					BigNumber.from(5)
				);
			});
			it('emits BidIncreased event', async () => {
				expect(receipt)
					.to.emit(queue_bidder, 'BidIncreased')
					.withArgs(BigNumber.from(95), 0);
			});
			it('accepts bid increase from non-submitter', async () => {
				queue_other = auctionQueue.connect(otherWallet);
				token_other = token.connect(otherWallet);
				await token.setBalance(otherWallet.address, 100);
				await token_other.approve(auctionQueue.address, 100);
				receipt = await queue_other.increaseBid(BigNumber.from(100), 0);
				bid = await auctionQueue.bids(0);

				expect(bid.amount).to.equal(BigNumber.from(195));
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(195)
				);
				expect(await token.balanceOf(otherWallet.address)).to.equal(
					BigNumber.from(0)
				);
				expect(receipt)
					.to.emit(queue_bidder, 'BidIncreased')
					.withArgs(BigNumber.from(195), 0);
			});

		});

		describe(':(', () => {
			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});

			it('reverts on invalid bid', async () => {
				receipt = queue_bidder.increaseBid(BigNumber.from(20), 1);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});

			it('reverts on inactive bid', async () => {
				// have the bid accepted to deactivate it
				queue_accepter = auctionQueue.connect(accepter);
				await queue_accepter.acceptBid(0);

				// bid should now be inactive
				receipt = queue_bidder.increaseBid(BigNumber.from(20), 0);

				await expect(receipt).to.be.revertedWith('bid inactive');
			});
		});
	});

	describe('withdrawBid', () => {
		let receipt;

		describe(':)', () => {
			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

				// fast forward in time
				await ethers.provider.send('evm_increaseTime', [lockup]);
				await ethers.provider.send('evm_mine');

				receipt = await queue_bidder.withdrawBid(BigNumber.from(25), 0);
			});

			it('decreases bid amount', async () => {
				bid = await auctionQueue.bids(0);

				expect(bid.amount).to.equal(BigNumber.from(50));
			});
			it('transfers correct tokens', async () => {
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(50)
				);
				expect(await token.balanceOf(bidder.address)).to.equal(
					BigNumber.from(50)
				);
			});
			it('emits BidWithdrawn event', async () => {
				expect(receipt)
					.to.emit(queue_bidder, 'BidWithdrawn')
					.withArgs(BigNumber.from(50), 0);
			});
		});

		describe(':(', () => {
			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});

			it('reverts on invalid bid', async () => {
				receipt = queue_bidder.withdrawBid(BigNumber.from(20), 2);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});

			it('reverts if not submitter', async () => {
				queue_other = auctionQueue.connect(otherWallet);
				token_other = token.connect(otherWallet);
				await token_other.approve(auctionQueue.address, 100);
				await expect(
					queue_other.withdrawBid(BigNumber.from(20), 0)
				).to.be.revertedWith('!submitter');
			});
			it('reverts if bid still locked', async () => {
				receipt = queue_bidder.withdrawBid(BigNumber.from(25), 0);
				await expect(receipt).to.be.revertedWith(
					'lockupPeriod not over'
				);
			});

			it('reverts if invalid amount', async () => {
				receipt = queue_bidder.withdrawBid(BigNumber.from(70), 0);
				await expect(receipt).to.be.revertedWith(
					'remaining bid too low'
				);
			});
			it('reverts on inactive bid', async () => {
				// have the bid accepted to deactivate it
				queue_accepter = auctionQueue.connect(accepter);
				await queue_accepter.acceptBid(0);

				// bid should now be inactive
				receipt = queue_bidder.withdrawBid(BigNumber.from(20), 0);

				await expect(receipt).to.be.revertedWith('bid inactive');
			});
		});
	});

	describe('cancelBid', () => {
		let receipt;

		describe(':)', () => {
			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

				// fast forward in time
				await ethers.provider.send('evm_increaseTime', [lockup]);
				await ethers.provider.send('evm_mine');

				receipt = await queue_bidder.cancelBid(0);
			});

			it('sets bid status to cancelled', async () => {
				bid = await auctionQueue.bids(0);

				expect(bid.status).to.equal(2);
			});
			it('returns all bid tokens to bidder', async () => {
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(0)
				);
				expect(await token.balanceOf(bidder.address)).to.equal(
					BigNumber.from(100)
				);
			});
			it('emits BidCanceled event', async () => {
				expect(receipt)
					.to.emit(queue_bidder, 'BidCanceled')
					.withArgs(0);
			});
		});

		describe(':(', () => {
			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});
			it('reverts on invalid bid', async () => {
				it('reverts on invalid bid', async () => {
					receipt = queue_bidder.cancelBid(2);
					await expect(receipt).to.be.revertedWith('invalid bid');
				});
			});

			it('reverts if not submitter', async () => {
				queue_other = auctionQueue.connect(otherWallet);
				await expect(queue_other.cancelBid(0)).to.be.revertedWith(
					'!submitter'
				);
			});
			it('reverts if bid still locked', async () => {
				receipt = queue_bidder.cancelBid(0);
				await expect(receipt).to.be.revertedWith(
					'lockupPeriod not over'
				);
			});
			it('reverts on inactive bid', async () => {
				// have the bid accepted to deactivate it
				queue_accepter = auctionQueue.connect(accepter);
				await queue_accepter.acceptBid(0);

				// bid should now be inactive
				receipt = queue_bidder.cancelBid(0);

				await expect(receipt).to.be.revertedWith('bid inactive');
			});
		});
	});

	describe('acceptBid', () => {
		describe('dao member accepters :)', () => {
			let receipt;

			before(async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				await token.setBalance(destination.address, 0);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

				queue_accepter = auctionQueue.connect(accepter);

				receipt = await queue_accepter.acceptBid(0);
			});
			it('transfers tokens to destination', async () => {
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(0)
				);
				expect(await token.balanceOf(destination.address)).to.equal(
					BigNumber.from(75)
				);
			});

			it('sets status to accepted', async () => {
				bid = await auctionQueue.bids(0);

				expect(bid.status).to.equal(1);
			});
			it('emits BidAccepted event', async () => {
				expect(receipt)
					.to.emit(queue_bidder, 'BidAccepted')
					.withArgs(accepter.address, 0);
			});
		});

		describe('owner accepter :)', () => {
			let receipt;

			beforeEach(async () => {
				await deployments.fixture(['accepterQueue']);
				auctionQueue = await getContract('accepterQueue');
				token = await getContract('TestERC20');

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				await token.setBalance(destination.address, 0);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

				queue_accepter = auctionQueue.connect(accepter);

				
			});
			it('transfers tokens to destination', async () => {
				receipt = await queue_accepter.acceptBid(0);
				expect(await token.balanceOf(auctionQueue.address)).to.equal(
					BigNumber.from(0)
				);
				expect(await token.balanceOf(destination.address)).to.equal(
					BigNumber.from(75)
				);
			});

			it('sets status to accepted', async () => {
				receipt = await queue_accepter.acceptBid(0);
				bid = await auctionQueue.bids(0);

				expect(bid.status).to.equal(1);
			});
			it('emits BidAccepted event', async () => {
				receipt = queue_accepter.acceptBid(0);
				await expect(receipt)
					.to.emit(queue_accepter, 'BidAccepted')
					.withArgs(accepter.address, 0);
			});
		});

		describe('general :(', () => {

			it('reverts on invalid bid', async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				queue_accepter = auctionQueue.connect(accepter);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
				receipt = queue_accepter.acceptBid(2);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});
			
			it('reverts on inactive bid', async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ] = await setup(bidder);

				queue_accepter = auctionQueue.connect(accepter);
				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
				await queue_accepter.acceptBid(0); // accept the bid
				receipt = queue_accepter.acceptBid(0); // attempt to accept it again
				await expect(receipt).to.be.revertedWith('bid inactive');
			});
		});

		describe('dao member accepters :(', () => {
			it('reverts if not moloch member', async () => {
				[ auctionQueue, queue_bidder, token, token_bidder ]= await setup(bidder);

				queue_accepter = auctionQueue.connect(accepter);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
				queue_other = auctionQueue.connect(otherWallet);

				receipt = queue_other.acceptBid(0);
				await expect(receipt).to.be.revertedWith(
					'!full moloch member'
				);
			});
			it('reverts if not *full* moloch member', async () => {
				await deployments.fixture(['highMinShares']);
				const queue = await getContract('highMinShares');
				token = await getContract('TestERC20');

				queue_bidder = queue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				await queue_bidder.submitBid(75, DETAILS);

				queue_accepter = queue.connect(accepter);

				const call = queue.acceptBid(0);

				await expect(call).to.be.revertedWith(
					'!full moloch member'
				);
			});
		});

		describe('owner accepter :(', () => {
			it('reverts if accepter is not owner', async () => {
				await deployments.fixture(['accepterQueue']);
				const auctionQueue = await getContract('accepterQueue');
				const token = await getContract('TestERC20');

				const queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				const token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				await token.setBalance(destination.address, 0);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

				queue_other = auctionQueue.connect(otherWallet);

				receipt = queue_other.acceptBid(0);

				await expect(receipt).to.be.revertedWith('!owner');
			});
		});
	});

	describe('changeMinBid', () => {
		let newMinBid;
		beforeEach(async () => {
			await deployments.fixture(['accepterQueue']); 
			auctionQueue = await getContract('accepterQueue'); // owner is accepter
			queue_accepter = auctionQueue.connect(accepter);
			token = await getContract('TestERC20');
		});

		it('owner can increase minBid', async () => {
			newMinBid = 500;
			await queue_accepter.changeMinBid(newMinBid);

			expect(await auctionQueue.minBid()).to.equal(newMinBid);
		});

		it('owner can decrease minBid', async () => {
			newMinBid = 2;
			await queue_accepter.changeMinBid(newMinBid);
			expect(await auctionQueue.minBid()).to.equal(newMinBid);
		});

		it('owner can decrease minBid to zero', async () => {
			newMinBid = 0;
			await queue_accepter.changeMinBid(newMinBid);
			expect(await auctionQueue.minBid()).to.equal(newMinBid);
		});

		it('owner can change minBid after bids are made', async () => {
			queue_bidder = auctionQueue.connect(bidder);
			await token.setBalance(bidder.address, 100);
			token_bidder = token.connect(bidder);
			await token_bidder.approve(queue_bidder.address, 100);
			await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

			newMinBid = 1000;
			await queue_accepter.changeMinBid(newMinBid);
			expect(await auctionQueue.minBid()).to.equal(newMinBid);
		});

		it('emits MinBidChanged event', async () => {
			newMinBid = 500;
			receipt = queue_accepter.changeMinBid(newMinBid);

			await expect(receipt).to.emit(queue_accepter, 'MinBidChanged').withArgs(newMinBid);
		})

		it('submitter cannot withdraw bid below new minBid', async () => {
			queue_bidder = auctionQueue.connect(bidder);
			await token.setBalance(bidder.address, 100);
			token_bidder = token.connect(bidder);
			await token_bidder.approve(queue_bidder.address, 100);
			await queue_bidder.submitBid(BigNumber.from(15), DETAILS); // original bid is higher than original minBid = 10

			// set newMinBid below original bid
			newMinBid = 2;
			await queue_accepter.changeMinBid(newMinBid);

			// decrease original bid to 1 (lower than newMinBid)
			receipt = queue_bidder.withdrawBid(14, 0); // 

			await expect(receipt).to.be.revertedWith('remaining bid too low');
		})

		it('non-owner cannot change bid', async () => {
			queue_other = auctionQueue.connect(otherWallet);

			newMinBid = 1000;
			receipt = queue_other.changeMinBid(newMinBid);

			await expect(receipt).to.be.revertedWith('!owner');
		});
		
	});
});
