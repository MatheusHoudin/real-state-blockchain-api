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
const { API_URL, API_KEY, CONTRACT_ADDRESS } = process.env;
console.log(process.env)
const settings = {
  apiKey: API_KEY,
  network: Network.ETH_SEPOLIA,
};

const web3 = createAlchemyWeb3(API_URL); 

const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);
const alchemy = new Alchemy(settings);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

function getNftCoinContract(contractAddress, signer) {
  return new ethers.Contract(contractAddress, realStateCoinABI.abi, signer)
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const validatePrivateKey = function (req, res, next) {
  if (req.headers["privatekey"] == undefined) {
    return res.sendStatus(401)
  }
  req.privateKey = req.headers["privatekey"]

  const signerAccount = new ethers.Wallet(req.privateKey, alchemyProvider);
  const realStateContract = new ethers.Contract(CONTRACT_ADDRESS, realStateNftABI.abi, signerAccount);

  req.realStateContract = realStateContract
  req.signer = signerAccount
  next()
}

app.use(validatePrivateKey)

function main() {
  
  app.get('/realStateNft', async (req, res) => {
    try {
      const realStateContract = req.realStateContract
      const contractName = await realStateContract.name();
      const contractSymbol = await realStateContract.symbol();
      let nftPrice = await realStateContract.NFT_VALUE();
      const user = req.privateKey !== undefined ? web3.eth.accounts.privateKeyToAccount(req.privateKey) : null
      nftPrice = BigInt(nftPrice).toString();
      let userEthBalance = await ethers.provider.getBalance(user.address)
      userEthBalance = BigInt(userEthBalance).toString()
      res.json({
        contractName,
        contractSymbol,
        nftPrice,
        contractAddress: CONTRACT_ADDRESS,
        user,
        userEthBalance
      })
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.get('/nft/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const realStateContract = req.realStateContract
      const coinAddress = await realStateContract.tokenCoin(id);
      const propertyClient = await realStateContract.propertyClient(id);
      const tokenUri = await realStateContract.tokenURI(id);
      axios.get(tokenUri)
      .then((response) => {
        res.json({
          coinAddress: coinAddress,
          nftId: id,
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
      const realStateContract = req.realStateContract
      const coinAddress = await realStateContract.tokenCoin(id);
      const coinContract = getNftCoinContract(coinAddress, req.signer);
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
      const realStateContract = req.realStateContract
      const nftResult = await realStateContract.createNFT(
        uri,
        initialSupply,
        lockedAmount,
        coinName,
        coinSymbol,
        {
            value: web3.utils.toWei("0.02", 'ether')
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
      const realStateContract = req.realStateContract
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
      const realStateContract = req.realStateContract
      const coinAddress = await realStateContract.tokenCoin(id);
      
      if (coinAddress == ZERO_ADDRESS) {
        return res.json({
          error: {
            reason: "Invalid address 0x0000000000000000000000000000000000000000"
          }
        })
      }

      const coinContract = getNftCoinContract(coinAddress, req.signer);
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

  app.get('/wallet/:owner', async (req, res) => {
    try {
      const owner = req.params.owner;
      const nfts = await alchemy.nft.getNftsForOwner(owner, {
        contractAddresses: ["0xC60320b983bCe296E982bD0440D86b4F6CD15bED"]
      })
      const balances = await alchemy.core.getTokensForOwner(owner);
      
      const tokens = []
      for (let token of balances.tokens) {

        if (token.decimals != null && token.decimals !== 0) {
          tokens.push(token)
        }
      }

      axios.all(nfts.ownedNfts.map((nft) => {
        if (nft.metadataError == undefined) {
          return axios.get(nft.tokenUri.gateway)
        }
      })).then((data) => {
        const metadataResult = data.map((nft) => {
          if (nft != undefined) {
            return nft.data
          }
        })
        const nftsResult = []
        nfts.ownedNfts.forEach((value, index) => {
          nftsResult.push({
            tokenId: value.tokenId,
            metadata: metadataResult[index]
          })
        })
        res.json({
          tokens,
          nfts: nftsResult
        });
      })
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  app.get('/nfts', async (req, res) => {
    try {
      const nfts = await alchemy.nft.getNftsForContract("0xC60320b983bCe296E982bD0440D86b4F6CD15bED")
      axios.all(nfts.nfts.map((nft) => {
        if (nft.metadataError == undefined) {
          return axios.get(nft.tokenUri.gateway)
        }
      })).then((data) => {
        const metadataResult = data.map((nft) => {
          if (nft != undefined) {
            return nft.data
          }
        })
        const nftsResult = []
        nfts.nfts.forEach((value, index) => {
          nftsResult.push({
            tokenId: value.tokenId,
            metadata: metadataResult[index]
          })
        })
        res.json(nftsResult);
      })
    } catch (err) {
      res.json(err)
    }
  })

  app.post('/setPropertyClient', async (req, res) => {
    try {
      const {client, nftId, rentValue} = req.body
      const realStateContract = req.realStateContract
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
      const realStateContract = req.realStateContract
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
      const realStateContract = req.realStateContract
      const coinAddress = await realStateContract.tokenCoin(id);
      
      if (coinAddress == ZERO_ADDRESS) {
        return res.json({
          error: {
            reason: "Invalid address 0x0000000000000000000000000000000000000000"
          }
        })
      }

      const coinContract = getNftCoinContract(coinAddress, req.signer);

      const result = await coinContract.withdrawDividends();

      res.json(result)
    } catch (err) {
      console.log(err)
      res.json(err)
    }
  })

  const server = app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
  })
  server.setTimeout(50000000)
}

main();