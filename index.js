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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

function getNftCoinContract(contractAddress) {
  return new ethers.Contract(contractAddress, realStateCoinABI.abi, signer)
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

function main() {
  
  app.get('/realStateNft', async (req, res) => {
    try {
      const contractName = await realStateContract.name();
      const contractSymbol = await realStateContract.symbol();
      let nftPrice = await realStateContract.NFT_VALUE();
      nftPrice = BigInt(nftPrice).toString();
      res.json({
        contractName,
        contractSymbol,
        nftPrice,
        contractAddress: CONTRACT_ADDRESS
      })
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

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
          propertyClient: {
            client: propertyClient[0],
            value: BigInt(propertyClient[1]).toString()
          },
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

  app.get('/nftCoin/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const coinAddress = await realStateContract.tokenCoin(id);
      const coinContract = getNftCoinContract(coinAddress);
      const name = await coinContract.name()
      const symbol = await coinContract.symbol()
      const totalSupply = await coinContract.totalSupply()
      const lockedAmount = await coinContract.lockedAmount()
      const availableTokenAmount = await coinContract.availableTokenAmount()
      const totalRentIncomeReceived = await coinContract.totalRentIncomeReceived()
      res.json({
        address: coinAddress,
        name,
        symbol,
        totalSupply: BigInt(totalSupply).toString(),
        lockedAmount: BigInt(lockedAmount).toString(),
        availableTokenAmount: BigInt(availableTokenAmount).toString(),
        totalRentIncomeReceived: BigInt(totalRentIncomeReceived).toString()
      })
    } catch (err) {
      console.log(err)
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
      web3.utils.fromWei()
      const buyResult = await realStateContract.buyCoins(
        nftId,
        buyerAddress,
        {
          value: web3.utils.toWei(ethValue, 'ether')
        }
      );
      res.json(buyResult)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.get('/currentInvestorCoinState/:id/investor/:investorAddress', async (req, res) => {
    try {
      const {id, investorAddress} = req.params;
      const coinAddress = await realStateContract.tokenCoin(id);
      
      if (coinAddress == ZERO_ADDRESS) {
        return res.json({
          error: {
            reason: "Invalid address 0x0000000000000000000000000000000000000000"
          }
        })
      }

      const coinContract = getNftCoinContract(coinAddress);
      const coinBalance = await coinContract.balanceOf(investorAddress)
      const holderPercentage = await coinContract.getHolderPercentage(investorAddress)
      const availableTokenAmount = BigInt(await coinContract.availableTokenAmount())
      const totalIncomeReceived = BigInt(await coinContract.totalRentIncomeReceived())
      const lastWithdrawal = BigInt(await coinContract.lastWithdrawalBase(investorAddress))

      const availableToWithdraw = (((totalIncomeReceived - lastWithdrawal) / BigInt(100)) * BigInt(holderPercentage));

      res.json({
        coinBalance: web3.utils.fromWei(BigInt(coinBalance).toString(), 'ether'),
        availableTokenAmount: web3.utils.fromWei(availableTokenAmount.toString()),
        holderPercentage: holderPercentage.toString(),
        totalIncomeReceived: web3.utils.fromWei(totalIncomeReceived.toString()),
        lastWithdrawal: web3.utils.fromWei(lastWithdrawal.toString()),
        availableToWithdraw: web3.utils.fromWei(availableToWithdraw.toString())
      })
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

  app.post('/setPropertyClient', async (req, res) => {
    try {
      const {client, nftId, rentValue} = req.body
      const result = await realStateContract.setPropertyClient(
        client,
        nftId,
        rentValue
      );
      res.json(result)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.post('/payRent/:nftId', async (req, res) => {
    try {
      const nftId = req.params.nftId
      const propertyClient = await realStateContract.propertyClient(nftId);
      const rentValue = BigInt(propertyClient[1]).toString();
      
      const result = await realStateContract.payRent(
        nftId,
        {
          value: rentValue
        }
      );
      res.json(result)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.post('/withdrawDividends/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const coinAddress = await realStateContract.tokenCoin(id);
      
      if (coinAddress == ZERO_ADDRESS) {
        return res.json({
          error: {
            reason: "Invalid address 0x0000000000000000000000000000000000000000"
          }
        })
      }

      const coinContract = getNftCoinContract(coinAddress);

      const result = await coinContract.withdrawDividends();

      res.json(result)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
  })
}

main();