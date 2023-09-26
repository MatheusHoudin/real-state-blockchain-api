const axios = require("axios");
const express = require("express");
const bodyParser = require('body-parser')
const app = express()
const { Alchemy, Network, Wallet, Utils } = require("alchemy-sdk");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { ethers } = require("hardhat");
const dotenv = require("dotenv");
const realStateNftABI = require("./abi/RealStateNFT.json");
const realStateCoinABI = require("./abi/RealStateCoin.json");

const b3 = require('./mocks/b3.json');
const b99 = require('./mocks/brooklyn99.json');

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

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

function main() {

  app.get('/nft/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const coinAddress = await realStateContract.tokenCoin(id);
      const propertyClient = await realStateContract.propertyClient(id);
      const tokenUri = await realStateContract.tokenURI(id);
      axios.get(tokenUri)
      .then((response) => {
        res.json({
          coinAddress: coinAddress,
          propertyClient: propertyClient,
          tokenUri: tokenUri,
          nftData: response.data
        });
      })
      .catch((err) => {
        res.json({
          coinAddress: coinAddress,
          propertyClient: propertyClient,
          tokenUri: tokenUri
        });
      });
    } catch (err) {
      res.json(err)
    }
  })

  app.post('/nft', async (req, res) => {
    try {
      const {uri, initialSupply, lockedAmount, coinName, coinSymbol} = req.body
      const nftResult = await realStateContract.createNFT(
        uri,
        initialSupply,
        lockedAmount,
        coinName,
        coinSymbol,
        {
            value: web3.utils.toWei("0.05", 'ether')
        }
      );
      console.log(nftResult)
      res.json(nftResult)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
  })
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

main();