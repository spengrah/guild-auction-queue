const { expect } = require('chai');
const { ethers, waffle, deployments, getChainId } = require('hardhat');
const { deploy, get } = deployments;
const { BigNumber, getContract, getSigners } = ethers;
const { lockupPeriod } = require('../deploy/args.json');

describe('GuildAuctionQueueFactory', () => {
	//
	let token, moloch, implementation, factory, auctionQueue;
	let deployer, destination;
	let lockup;

	before(async () => {
		[deployer, , , destination] = await getSigners();
		lockup = lockupPeriod[await getChainId()];
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

	describe('create', () => {
		beforeEach(async () => {
			await deployments.fixture(['queue']);
			auctionQueue = await getContract('queue');
			token = await getContract('TestERC20');
			moloch = await getContract('MolochTest');
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
		it('emits NewQueue event', async () => {
			const { receipt } = await get('queue');
			const emitted = receipt.events[0].event;
			console.log(emitted);
			expect(emitted).to.equal('NewQueue');
		});
	});

	describe('predictDeterministicAddress', () => {
		it('predicts correct address', async () => {
			const salt = ethers.constants.HashZero;

			await deployments.fixture(['queueDeterministic']);
			factory = await getContract('GuildAuctionQueueFactory');
			const factory_deployer = factory.connect(deployer);
			const predicted =
				await factory_deployer.predictDeterministicAddress(salt);

			auctionQueue = await getContract('queueDeterministic');
			const actual = auctionQueue.address;

			expect(predicted).to.equal(actual);
		});
	});

	describe('createDeterministic', () => {
		beforeEach(async () => {
			await deployments.fixture(['queueDeterministic']);
			implementation = await getContract('GuildAuctionQueue');
			factory = await getContract('GuildAuctionQueueFactory');
			token = await getContract('TestERC20');
			moloch = await getContract('MolochTest');
			auctionQueue = await getContract('queueDeterministic');
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
		it('emits NewQueue event', async () => {
			const { receipt } = await get('queueDeterministic');
			const emitted = receipt.events[0].event;
			console.log(emitted);
			expect(emitted).to.equal('NewQueue');
		});
	});
});
