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
const alchemy = new Alchemy(settings);

// Signer
const signer = new ethers.Wallet(PRIVATE_KEY_OWNER, alchemyProvider);
const buyerSigner = new ethers.Wallet(PRIVATE_KEY_BUYER, alchemyProvider);

// Contract
const realStateContract = new ethers.Contract(CONTRACT_ADDRESS, realStateNftABI.abi, signer);

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

  app.post('/buyCoins', async (req, res) => {
    try {
      const {nftId, buyerAddress, ethValue} = req.body
      const buyResult = await realStateContract.buyCoins(
        nftId,
        buyerAddress,
        {
          value: web3.utils.toWei(ethValue, 'ether')
        }
      );
      console.log(buyResult)
      let waitResult = buyResult.wait();
      res.json(waitResult)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.get('/nfts/:owner', async (req, res) => {
    try {
      const owner = req.params.owner;
      const nfts = await alchemy.nft.getNftsForOwner(owner, {
        contractAddresses: ["0xd9f8B406d91486298915b9b6eE189Cc77dCE2C59"]
      })
      res.json(nfts);
    } catch (err) {
      res.json(err)
    }
  })

  app.get('/nfts', async (req, res) => {
    try {
      const nfts = await alchemy.nft.getNftsForContract("0xd9f8B406d91486298915b9b6eE189Cc77dCE2C59")
      res.json(nfts);
    } catch (err) {
      res.json(err)
    }
  })

  app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
  })
}

main();