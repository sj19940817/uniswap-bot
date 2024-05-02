const { get } = require('axios')
const {
  JsonRpcProvider,
  Contract,
  parseUnits,
  formatUnits,
  Wallet,
  MaxUint256,
  Transaction,
  parseEther
} = require('ethers')
require('dotenv').config()

// usdt token
const tokenAbi = require('./abi/usdtAbi.json')
const tokenAddress = process.env.TOKEN_ADDRESS


const Auth = Buffer.from(
  process.env.INFURA_API_KEY + ":" + process.env.INFURA_API_KEY_SECRET,
).toString("base64")


// Wallet
const provider = new JsonRpcProvider(process.env.INFURA_ARBITRUM_MAINNET)
const tokenContract = new Contract(tokenAddress, tokenAbi, provider)
const tokenBalancePromise = tokenContract.balanceOf(process.env.MY_WALLET_ADDRESS)
const tokenSymbolPromise = tokenContract.symbol()
const tokenDecimalsPromise = tokenContract.decimals()

Promise.all([tokenBalancePromise, tokenSymbolPromise, tokenDecimalsPromise])
  .then(async ([tokenBalance, tokenSymbol, tokenDecimals]) => {
    console.log(`tokenBalance=${tokenBalance} tokenSymbol=${tokenSymbol}`)



    if (tokenBalance > 0) {
      // await DoSwap(tokenBalance, tokenAddress, tokenAbi, tokenSymbol, tokenDecimals)
      await DoSwap(parseUnits('2', tokenDecimals), tokenAddress, tokenAbi, tokenSymbol, tokenDecimals)
    } else {
      console.log(`${tokenSymbol} token is not enough to swap`)
    }
  })



const DoSwap = async (_tokenBalance, _tokenAddress, _tokenAbi, _tokenSymbol, _tokenDecimals) => {
  const loopTimer = setInterval(async () => {
    let info = { estimatedBaseFee: '10.000000000' }
    try {
      // const { data } = await get(
      //   `https://gas.api.infura.io/networks/${process.env.ARBITRUM_CHAIN_ID}/suggestedGasFees`,
      //   {
      //     headers: {
      //       Authorization: `Basic ${Auth}`,
      //     },
      //   },
      // )

      // info = data
    } catch (error) {
      clearInterval(loopTimer)
      console.log("Server responded with:", error)
      return
    }

    if (parseUnits(info.estimatedBaseFee, 9) > 20000000000)
      return

    clearInterval(loopTimer)
    
    const signer = new Wallet(process.env.MY_WALLET_PREV_KEY)
    const account = signer.connect(provider)
    const tokenAllowedContract = new Contract(_tokenAddress, _tokenAbi, account)

    // UniSwap
    const router2Abi = require('./abi/uniRouter2Abi.json')
    const router2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'   // uniswap
    const router2 = new Contract(router2Address, router2Abi, account)

    // const amount = await tokenAllowedContract.allowance(process.env.MY_WALLET_ADDRESS, router2Address)
    // if (amount < 115792089237316195423570985008687907853269984665640564039457584007913129639935n) {
    //   try {
    //     const approve = await tokenAllowedContract.approve(
    //       router2Address,
    //       MaxUint256,
    //       {
    //         gasLimit: Transaction.gasLimit,
    //         gasPrice: Transaction.gasPrice
    //       }
    //     ).catch((err) => {
    //       console.log(err)
    //       console.log("Error: token approve failed")
    //     })
        
    //   } catch(err) {
    //       console.log(err)
    //   }
    // }

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    const swapAmount = await router2.swapExactTokensForETHSupportingFeeOnTransferTokens(
      _tokenBalance,
      0,
      [tokenAddress, process.env.WETH],
      process.env.MY_WALLET_ADDRESS,
      deadline,
      {
        gasLimit: 500000,
        gasPrice: parseUnits('1', 'gwei')
      }
    )

    const swapToken = formatUnits(_tokenBalance, _tokenDecimals)
    console.log(`Swapped USDT(${swapToken}${_tokenSymbol}) to Ether(${swapAmount}ETH) successfully`)
  }, 500)
}


