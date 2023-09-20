const { Alchemy, Network, Wallet, Utils } = require("alchemy-sdk");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { ethers } = require("hardhat");
const dotenv = require("dotenv");
const realStateNftABI = require("./abi/RealStateNFT.json");
const realStateCoinABI = require("./abi/RealStateCoin.json");

dotenv.config();
const { API_URL, API_KEY, PRIVATE_KEY_OWNER, CONTRACT_ADDRESS, PRIVATE_KEY_BUYER } = process.env;

const settings = {
  apiKey: API_KEY,
  network: Network.ETH_SEPOLIA,
};

const web3 = createAlchemyWeb3(API_URL); 

const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);

// Signer
const signer = new ethers.Wallet(PRIVATE_KEY_OWNER, alchemyProvider);
const buyerSigner = new ethers.Wallet(PRIVATE_KEY_BUYER, alchemyProvider);

// Contract
const realStateContract = new ethers.Contract(CONTRACT_ADDRESS, realStateNftABI.abi, buyerSigner);

async function main() {
  await buyCoins();
}

async function buyCoins() {
  const buyResult = await realStateContract.buyCoins(
    1,
    '0x2b0938aa49C457CCdE9b6Ab1d30EB1f4464423d5',
    {
      value: web3.utils.toWei("0.05", 'ether')
    }
  );
  console.log(buyResult)
  let waitResult = buyResult.wait();
  console.log(waitResult)
}

async function createNewNft() {
  const nftResult = await realStateContract.createNFT(
    "www.matheus.com.br",
    '10000000000000000000000',
    '1000000000000000000000',
    "EmpireState",
    "EST",
    {
        value: web3.utils.toWei("0.05", 'ether')
    }
  );

  console.log(nftResult);
}

async function readTokenAndPropertyClient() {
  const coinAddress = await realStateContract.tokenCoin(0);
  const propertyClient = await realStateContract.propertyClient(0);

  console.log(coinAddress);
  console.log(propertyClient)
}

main();