const { getChainId } = require('hardhat');
const deployArgs = require('./args.json');

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();

	console.log('Deploying on network...');

	const chainId = await getChainId();

	console.log('...', chainId);

	let token;
	let moloch;

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
		token = deployArgs.token[chainId];
		moloch = deployArgs.moloch[chainId];
	}

	const GuildAuctionQueue = await deploy('GuildAuctionQueue', {
		from: deployer,
		args: [token, moloch, destination, deployArgs.lockupPeriod],
		log: true,
	});

	console.log('deployed GuildAuctionQueue to ', GuildAuctionQueue.address);
};

module.exports.tags = ['GuildAuctionQueue'];
