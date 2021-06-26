const { membersCanAccept: deployArgs } = require('../args.json');
const { getQueueAddress } = require('../utils.js');

// deploy script for
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
	const { deploy, execute, save, get } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();

	const chainId = await getChainId();

	const lockupPeriod = deployArgs.lockupPeriod[chainId];

	const minShares = deployArgs.minShares[chainId];
	const minBid = deployArgs.minBid[chainId];


	const token = await deploy('TestERC20', {
		from: deployer,
		args: ['Token', 'TKN', 0],
		log: true,
	});

	const moloch = await deploy('TestMoloch', {
		from: deployer,
		args: [accepter],
		log: true,
	});

	const factory = await get('GuildAuctionQueueFactory');

	const minion = await deploy('TestMinion', {
		from: deployer,
		args: [moloch.address, factory.address],
		log: true,
	});

	const receipt = await execute(
		'TestMinion',
		{ from: deployer, log: true },
		'create',
		token.address,
		destination,
		lockupPeriod,
		minBid,
		minShares
	);

	const { abi: factoryABI } = factory;

	const queueAddress = await getQueueAddress(receipt, factoryABI);

	const { abi: queueABI } = await get('GuildAuctionQueue');
	const txHash = receipt.transactionHash;
	const gasUsed = receipt.gasUsed.toString();

	// build DeploymentSubmission object
	const deploymentSubmission = {
		abi: queueABI,
		address: queueAddress,
		receipt: receipt,
	};

	// save the contract for easy access during testing
	await save('queue', deploymentSubmission);

	// mimic deployment logging for
	// console.log(
	// 	'deploying "queue" (tx:',
	// 	txHash,
	// 	')...: deployed at',
	// 	queueAddress,
	// 	'with',
	// 	gasUsed,
	// 	'gas'
	// );
};

module.exports.tags = ['queue'];
module.exports.dependencies = ['GuildAuctionQueueFactory'];
