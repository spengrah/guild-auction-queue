module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy, get } = deployments;
	const { deployer } = await getNamedAccounts();

	const Implementation = await get('GuildAuctionQueue');

	await deploy('GuildAuctionQueueFactory', {
		from: deployer,
		args: [Implementation.address],
		skipIfAlreadyDeployed: true,
		log: true,
	});
};

module.exports.tags = ['GuildAuctionQueueFactory'];
module.exports.dependencies = ['GuildAuctionQueue'];
