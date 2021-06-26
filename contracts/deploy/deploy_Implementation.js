module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	await deploy('GuildAuctionQueue', {
		from: deployer,
		skipIfAlreadyDeployed: true,
		log: true,
	});
};

module.exports.tags = ['GuildAuctionQueue'];
