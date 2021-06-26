const { ownerCanAccept: deployArgs } = require('../args.json');
const { getQueueAddress } = require('../utils.js');

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
	const { deploy, execute, save, get } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();

	const chainId = await getChainId();

	const lockupPeriod = deployArgs.lockupPeriod[chainId];
	const minShares = 0;
	const minBid = deployArgs.minBid[chainId];

	const token = await deploy('TestERC20', {
		from: deployer,
		args: ['Token', 'TKN', 0],
		log: true,
	});

	const receipt = await execute(
		'GuildAuctionQueueFactory',
		{ from: accepter, log: true },
		'create',
		token.address,
		destination,
		lockupPeriod,
		minBid,
		minShares
	);

	const txHash = receipt.transactionHash;
	const gasUsed = receipt.gasUsed.toString();

	// build DeploymentSubmission object
	
	const factory = await get('GuildAuctionQueueFactory');
	const { abi: factoryABI } = factory;

	const queueAddress = await getQueueAddress(receipt, factoryABI);

	const { abi: queueABI } = await get('GuildAuctionQueue');
	const deploymentSubmission = {
		abi: queueABI,
		address: queueAddress,
		receipt: receipt,
	};

	// save the contract for easy access during testing
	await save('accepterQueue', deploymentSubmission);

	// mimic deployment logging
	// console.log(
	// 	'deploying "accepterQueue" (tx:',
	// 	txHash,
	// 	')...: deployed at',
	// 	queueAddress,
	// 	'with',
	// 	gasUsed,
	// 	'gas'
	// );
};

module.exports.tags = ['accepterQueue'];
module.exports.dependencies = ['GuildAuctionQueueFactory'];
