const { getChainId } = require('hardhat');
const deployArgs = require('./args.json');

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy } = deployments;
	const { deployer, accepter, destination } = await getNamedAccounts();

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

	const GuildAuctionQueue = await deploy('GuildAuctionQueue', {
		from: deployer,
		args: [token.address, moloch.address, destination, lockupPeriod],
		log: true,
	});
};

module.exports.tags = ['GuildAuctionQueue'];
