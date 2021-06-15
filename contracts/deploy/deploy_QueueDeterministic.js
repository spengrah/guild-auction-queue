const deployArgs = require('./args.json');

module.exports = async ({
	getNamedAccounts,
	deployments,
	getChainId,
	ethers,
}) => {
	const { deploy, execute, save, get } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();
	const salt = ethers.constants.HashZero;

	const chainId = await getChainId();

	let token;
	let moloch;
	const lockupPeriod = deployArgs.lockupPeriod[chainId];

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
		'createDeterministic',
		token.address,
		moloch.address,
		destination,
		lockupPeriod,
		salt
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

	// save the "queueDeterministic" contract for easy access during testing
	await save('queueDeterministic', deploymentSubmission);

	// mimic deployment logging for "queueDeterministic"
	console.log(
		'deploying "queueDeterministic" (tx:',
		txHash,
		')...: deployed at',
		queueAddress,
		'with',
		gasUsed,
		'gas'
	);
};

module.exports.tags = ['queueDeterministic'];
module.exports.dependencies = ['GuildAuctionQueueFactory'];
