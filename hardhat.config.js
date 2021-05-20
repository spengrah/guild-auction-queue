require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

const { ETHERSCAN_API_KEY, INFURA_PROJECT_ID, SEED } = process.env;

// const deployer = [`0x${PRIVATE_KEY}`];

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
		version: '0.8.0',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			accounts: {
				mnemonic: SEED,
			},
		},
		xdai: {
			url: 'https://xdai.1hive.org/',
			accounts: {
				mnemonic: SEED,
				count: 1,
				gasPrice: 1000000000,
			},
		},
		rinkeby: {
			url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: SEED,
				count: 1,
			},
		},
		mainnet: {
			url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: SEED,
				count: 1,
			},
			gas: 3200000,
			gasPrice: 150000000000,
		},
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY,
	},
};
