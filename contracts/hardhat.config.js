require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-gas-reporter');
require('hardhat-deploy');
require('hardhat-deploy-ethers');

const { ETHERSCAN_API_KEY, INFURA_PROJECT_ID, SEED } = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
	const accounts = await ethers.getSigners();

	for (const account of accounts) {
		console.log(account.address);
	}
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	solidity: {
		compilers: [
			{
				version: '0.8.0',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		],
	},
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			accounts: {
				mnemonic: SEED,
			},
			chainId: 1337,
			tags: ['test'],
		},
		xdai: {
			url: 'https://xdai.1hive.org/',
			accounts: {
				mnemonic: SEED,
				gasPrice: 1000000000,
			},
			tags: ['prod'],
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: SEED,
			},
			tags: ['staging'],
		},
		mainnet: {
			url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: SEED,
			},
			gas: 3200000,
			gasPrice: 150000000000,
			tags: ['prod'],
		},
	},
	namedAccounts: {
		deployer: 0,
		bidder: 1,
		accepter: 2,
		destination: 3,
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY,
	},
};
