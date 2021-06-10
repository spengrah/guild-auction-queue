const { expect } = require('chai');
const {
	artifacts,
	ethers,
	waffle,
	deployments,
	getChainId,
} = require('hardhat');
const { deployContract } = waffle;
const { BigNumber } = ethers;
const { lockupPeriod } = require('../deploy/args.json');

async function setup() {
	await deployments.fixture(['GuildAuctionQueue']);
	const auctionQueue = await ethers.getContract('GuildAuctionQueue');
	const token = await ethers.getContract('TestERC20');
	const moloch = await ethers.getContract('MolochTest');

	return {
		auctionQueue,
		token,
		moloch,
	};
}

const DETAILS =
	'0x1000000000000000000000000000000000000000000000000000000000000000';

describe('AuctionQueue', () => {
	let bidder, accepter, otherWallet, destination; // wallets
	let token, moloch, auctionQueue; // deployed contracts
	let lockup;

	before(async () => {
		[deployer, bidder, accepter, destination, otherWallet] =
			await ethers.getSigners();

		lockup = lockupPeriod[await getChainId()];
	});

	describe('deployment', () => {
		beforeEach(async () => {
			const contracts = await setup();
			auctionQueue = contracts.auctionQueue;
			token = contracts.token;
			moloch = contracts.moloch;
		});

		it('sets the token', async () => {
			expect(await auctionQueue.token()).to.equal(token.address);
		});
		it('sets the moloch', async () => {
			expect(await auctionQueue.moloch()).to.equal(moloch.address);
		});
		it('sets the destination', async () => {
			expect(await auctionQueue.destination()).to.equal(
				destination.address
			);
		});
		it('sets the lockupPeriod', async () => {
			expect(await auctionQueue.lockupPeriod()).to.equal(
				BigNumber.from(lockup)
			);
		});
	});

	// before('deploy', async () => {
	// 	token = await deployContract(deployer, TestERC20, [
	// 		'Token',
	// 		'TKN',
	// 		100,
	// 	]);
	// 	moloch = await deployContract(deployer, Moloch, [accepter.address]);
	// });

	describe('submitBid', () => {
		beforeEach(async () => {
			const contracts = await setup();

			auctionQueue = contracts.auctionQueue;
			token = contracts.token;
			moloch = contracts.moloch;

			queue_bidder = auctionQueue.connect(bidder);
			await token.setBalance(bidder.address, 100);
			token_bidder = token.connect(bidder);
			await token_bidder.approve(queue_bidder.address, 75);
		});
		it('creates new Bid', async () => {
			receipt = await queue_bidder.submitBid(BigNumber.from(75), DETAILS);

			block = await bidder.provider.getBlock(receipt.blockNumber);
			time = block.timestamp;

			bid = await auctionQueue.bids(0);

			expect(bid.details).to.equal(DETAILS);
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
			block = await bidder.provider.getBlock(receipt.blockNumber);
			time = block.timestamp;

			expect(receipt)
				.to.emit(queue_bidder, 'NewBid')
				.withArgs(BigNumber.from(75), bidder.address, 0, DETAILS, time);
		});
	});

	describe('increaseBid', () => {
		let receipt;
		let queue_bidder;

		describe(':)', () => {
			beforeEach(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

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
		});

		describe(':(', () => {
			before(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});

			it('reverts on invalid bid', async () => {
				receipt = queue_bidder.increaseBid(BigNumber.from(20), 1);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});

			it('reverts if not submitter', async () => {
				queue_other = auctionQueue.connect(otherWallet);
				await expect(
					queue_other.increaseBid(BigNumber.from(20), 0)
				).to.be.revertedWith('must be submitter');
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
		let queue_bidder;

		describe(':)', () => {
			before(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

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
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});

			it('reverts on invalid bid', async () => {
				receipt = queue_bidder.withdrawBid(BigNumber.from(20), 2);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});

			it('reverts if not submitter', async () => {
				queue_other = auctionQueue.connect(otherWallet);
				await expect(
					queue_other.increaseBid(BigNumber.from(20), 0)
				).to.be.revertedWith('must be submitter');
			});
			it('reverts if bid still locked', async () => {
				receipt = queue_bidder.withdrawBid(BigNumber.from(25), 0);
				await expect(receipt).to.be.revertedWith(
					'lockupPeriod not over'
				);
			});

			it('reverts if invalid amount', async () => {
				// have the bid get unlocked
				await ethers.provider.send('evm_increaseTime', [lockup]);
				await ethers.provider.send('evm_mine');

				receipt = queue_bidder.withdrawBid(BigNumber.from(76), 0);
				await expect(receipt).to.be.reverted;
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
		let queue_bidder;

		describe(':)', () => {
			before(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

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
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

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
					'must be submitter'
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
		describe(':)', () => {
			let receipt;
			let queue_bidder;

			before(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				await token.setBalance(destination.address, 0);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

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

		describe(':(', () => {
			before(async () => {
				const contracts = await setup();

				auctionQueue = contracts.auctionQueue;
				token = contracts.token;
				moloch = contracts.moloch;

				queue_bidder = auctionQueue.connect(bidder);
				await token.setBalance(bidder.address, 100);
				token_bidder = token.connect(bidder);
				await token_bidder.approve(queue_bidder.address, 100);

				queue_accepter = auctionQueue.connect(accepter);

				await queue_bidder.submitBid(BigNumber.from(75), DETAILS);
			});
			it('reverts on invalid bid', async () => {
				receipt = queue_accepter.acceptBid(2);
				await expect(receipt).to.be.revertedWith('invalid bid');
			});
			it('reverts if not moloch member', async () => {
				queue_other = auctionQueue.connect(otherWallet);

				receipt = queue_other.acceptBid(0);
				await expect(receipt).to.be.revertedWith(
					'not member of moloch'
				);
			});
			it('reverts on inactive bid', async () => {
				await queue_accepter.acceptBid(0);
				receipt = queue_accepter.acceptBid(0);
				await expect(receipt).to.be.revertedWith('bid inactive');
			});
		});
	});
});
