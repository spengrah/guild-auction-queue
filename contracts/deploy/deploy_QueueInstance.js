const deployArgs = require('./args.json');

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
	const { deploy, execute, save, get } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();

	const chainId = await getChainId();

	let token;
	let moloch;
	const lockupPeriod = deployArgs.lockupPeriod[chainId];
	const minShares = deployArgs.minShares[chainId];

	// if deploying for testing, deploy test integration contracts
	if (hre.network.tags.test) {
		token = await deploy('TestERC20', {
			from: deployer,
			args: ['Token', 'TKN', 0],
			log: true,
		});

		moloch = await deploy('MolochTest', {
			from: deployer,
			args: [accepter],
			log: true,
		});
	} else {
		// otherwise, use existing contracts
		token = {
			address: deployArgs.token[chainId],
		};
		moloch = {
			address: deployArgs.moloch[chainId],
		};
	}

	const receipt = await execute(
		'GuildAuctionQueueFactory',
		{ from: deployer, log: true },
		'create',
		token.address,
		moloch.address,
		destination,
		lockupPeriod,
		minShares
	);

	const queueAddress = receipt.events[0].args['queueAddress'].toString();
	const txHash = receipt.transactionHash;
	const gasUsed = receipt.gasUsed.toString();

	// build DeploymentSubmission object
	const { abi } = await get('GuildAuctionQueue');
	const deploymentSubmission = {
		abi: abi,
		address: queueAddress,
		receipt: receipt,
	};

	// save the "queue" contract for easy access during testing
	await save('queue', deploymentSubmission);

	// mimic deployment logging for "queue"
	console.log(
		'deploying "queue" (tx:',
		txHash,
		')...: deployed at',
		queueAddress,
		'with',
		gasUsed,
		'gas'
	);
};

module.exports.tags = ['queue'];
module.exports.dependencies = ['GuildAuctionQueueFactory'];
