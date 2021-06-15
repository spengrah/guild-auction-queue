module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	const Implementation = await deployments.get('GuildAuctionQueue');

	await deploy('GuildAuctionQueueFactory', {
		from: deployer,
		args: [Implementation.address],
		skipIfAlreadyDeployed: true,
		log: true,
	});
};

module.exports.tags = ['GuildAuctionQueueFactory'];
module.exports.dependencies = ['GuildAuctionQueue'];
