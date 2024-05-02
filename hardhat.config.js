/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");

const { API_URL, PRIVATE_KEY_OWNER } = process.env;

module.exports = {
  solidity: "0.8.19",
  defaultNetwork: "sepolia",
  networks: {
     hardhat: {},
     sepolia: {
        url: API_URL,
        accounts: [`${PRIVATE_KEY_OWNER}`]
     }
  },
};
