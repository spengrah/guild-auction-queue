const { expect, use } = require('chai');
const { ethers, waffle, deployments, getChainId } = require('hardhat');
const { solidity } = waffle;
const { deploy, get } = deployments;
const { BigNumber, getContract, getSigners } = ethers;
const { membersCanAccept, ownerCanAccept } = require('../deploy/args.json');
// const utils = require('../deploy/utils.js');

use(solidity);

describe('GuildAuctionQueueFactory', () => {
	//
	let token, implementation, factory, auctionQueue;
	let deployer, accepter, destination;
	let lockup;
	let minShares;
	let minBid;
	let chainId;

	before(async () => {
		[deployer, , accepter, destination] = await getSigners();
		chainId = await getChainId();
		
	});

	describe('deployment', () => {
		it('deploys with correct implementation', async () => {
			await deployments.fixture(['GuildAuctionQueueFactory']);
			implementation = await getContract('GuildAuctionQueue');
			factory = await getContract('GuildAuctionQueueFactory');
			expect(await factory.implementation()).to.equal(
				implementation.address
			);
		});

		it('reverts on invalid implementation', async () => {
			const badImplementation = ethers.constants.AddressZero;

			await expect(
				deploy('GuildAuctionQueueFactory', {
					from: deployer.address,
					args: [badImplementation],
					logs: true,
				})
			).to.be.revertedWith('invalid implementation');
		});
	});

	describe('create queue instance with DAO members as bid accepters', () => {
		before( () => {
			lockup = membersCanAccept.lockupPeriod[chainId];
			minShares = membersCanAccept.minShares[chainId];
			minBid = membersCanAccept.minBid[chainId];
		})

		beforeEach(async () => {
			await deployments.fixture(['queue']);
			auctionQueue = await getContract('queue');
			token = await getContract('TestERC20');
		});

		it('sets the token', async () => {
			expect(await auctionQueue.token()).to.equal(token.address);
		});
		it('sets deployer (msg.sender) as the owner', async () => {
			const minion = await getContract('TestMinion');
			expect(await auctionQueue.owner()).to.equal(
				minion.address
			);
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
		it('sets the minShares', async () => {
			expect(await auctionQueue.minShares()).to.equal(
				BigNumber.from(minShares)
			);
		});
		it('sets the minBid', async () => {
			expect(await auctionQueue.minBid()).to.equal(
				BigNumber.from(minBid)
			);
		});
		it('sets membersCanAccept to `1`', async () => {
			expect(await auctionQueue.membersCanAccept()).to.equal(1);
		});
		it('emits NewQueue event', async () => {
			const { receipt, address } = await get('queue');
			const { abi } = await get('GuildAuctionQueueFactory');
			const iface = new ethers.utils.Interface(abi);
			const eventFragment = iface.events[Object.keys(iface.events)[0]];
			const event = receipt.logs[0];
			const decodedLog = iface.decodeEventLog(
				eventFragment,
				event.data,
				event.topics,
			);
			expect(decodedLog.queueAddress).to.equal(address);

			const minion = await getContract('TestMinion');
			expect(decodedLog.owner).to.equal(minion.address);
			expect(decodedLog.token).to.equal(token.address);
			expect(decodedLog.destination).to.equal(destination.address);
			expect(decodedLog.lockupPeriod).to.equal(BigNumber.from(lockup));
			expect(decodedLog.minBid).to.equal(BigNumber.from(minBid));
			expect(decodedLog.minShares).to.equal(BigNumber.from(minShares));
		});
	});

	describe('create queue instance with owner as sole bid accepter', () => {
		
		before( () => {
			lockup = ownerCanAccept.lockupPeriod[chainId];
			minShares = ownerCanAccept.minShares[chainId];
			minBid = ownerCanAccept.minBid[chainId];
		})

		beforeEach(async () => {
			await deployments.fixture(['accepterQueue']);
			auctionQueue = await getContract('accepterQueue');
			token = await getContract('TestERC20');
		});

		it('sets the token', async () => {
			expect(await auctionQueue.token()).to.equal(token.address);
		});
		it('sets deployer (msg.sender) as the owner', async () => {
			expect(await auctionQueue.owner()).to.equal(
				accepter.address
			);
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
		it('results in minShares == 0 ', async () => {
			expect(await auctionQueue.minShares()).to.equal(0);
		});
		it('sets the minBid', async () => {
			expect(await auctionQueue.minBid()).to.equal(
				BigNumber.from(minBid)
			);
		});
		it('sets membersCanAccept to `0`', async () => {
			expect(await auctionQueue.membersCanAccept()).to.equal(0);
		});
		it('emits NewQueue event', async () => {
			// const queue = await get('accepterQueue');
			// console.log(queue.address);
			const { receipt, address } = await get('accepterQueue');
			// console.log(address);
			const { abi } = await get('GuildAuctionQueueFactory');
			const iface = new ethers.utils.Interface(abi);
			const eventFragment = iface.events[Object.keys(iface.events)[0]];
			const event = receipt.logs[0];
			const decodedLog = iface.decodeEventLog(
				eventFragment,
				event.data,
				event.topics,
			);
			expect(decodedLog.queueAddress).to.equal(address);
			expect(decodedLog.owner).to.equal(accepter.address);
			expect(decodedLog.token).to.equal(token.address);
			expect(decodedLog.destination).to.equal(destination.address);
			expect(decodedLog.lockupPeriod).to.equal(BigNumber.from(lockup));
			expect(decodedLog.minBid).to.equal(BigNumber.from(minBid));
			expect(decodedLog.minShares).to.equal(BigNumber.from(0));
			
		});
	});

	
});
