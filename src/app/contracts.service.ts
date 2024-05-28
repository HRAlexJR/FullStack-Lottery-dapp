import { Injectable } from '@angular/core'
import { ethers, BigNumber } from 'ethers'
import bigNumberToETHString from 'src/helpers/bigNumberToETHString'
import * as ContractAddressesJSON from '../assets/contracts/contracts.json'
import * as LotteryContractJSON from '../assets/contracts/lottery-contract/Lottery.json'
import * as LotteryTokenContractJSON from '../assets/contracts/lottery-token-contract/LotteryToken.json'
import currentEpoch from '../helpers/currentEpoch'
import calculateWinningFee from '../helpers/calculateWinningFee'

@Injectable({
  providedIn: 'root',
})
export class ContractsService {
  currentAccount: string
  isLoggedIn: Boolean

  contractOwner: string

  lotteryContractAddress: string
  lotteryTokenContractAddress: string

  contractAddressesJSON: {
    lotteryContractAddress: string
    lotteryTokenContractAddress: string
  }
  lotteryContractJSON: any
  lotteryTokenContractJSON: any

  provider: ethers.providers.BaseProvider

  constructor() {
    this.currentAccount = ''
    this.isLoggedIn = false
    this.contractOwner = ''

    this.contractAddressesJSON = ContractAddressesJSON
    this.lotteryContractAddress = this.contractAddressesJSON.lotteryContractAddress
    this.lotteryTokenContractAddress = this.contractAddressesJSON.lotteryTokenContractAddress

    this.lotteryContractJSON = LotteryContractJSON
    this.lotteryTokenContractJSON = LotteryTokenContractJSON

    this.provider = ethers.getDefaultProvider('goerli')
    // this.provider = ethers.getDefaultProvider('http://localhost:8545')
  }

  // get metamask account/signer/address
  async checkWalletConnection(ethereum: any) {
    try {
      if (!ethereum) {
        window.alert('MetaMask needed to use this site!')
      } else {
        //
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' })

      if (accounts.length !== 0) {
        const account = accounts[0]

        //
        this.currentAccount = account

        this.isLoggedIn = true
        return true
      } else {
        this.isLoggedIn = false
        window.alert('Connect site to MetaMask account to use this page!')
        return false
      }
    } catch (error) {
      console.error(error)
      return false
    }
  }

  // connect to metamask on button click
  async connectToWallet(ethereum: any): Promise<string> {
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    })

    const account = accounts[0]
    this.currentAccount = account
    this.isLoggedIn = true
    return this.currentAccount
  }

  // get metamask wallet signer
  async getMetamaskWalletSigner(ethereum: any) {
    const metamaskWalletProvider = new ethers.providers.Web3Provider(ethereum)
    return metamaskWalletProvider.getSigner()
  }

  // get wallet balance
  async getWalletBalance(ethereum: any) {
    const metamaskWalletProvider = new ethers.providers.Web3Provider(ethereum)
    return bigNumberToETHString(
      await metamaskWalletProvider.getSigner().getBalance(),
    )
  }

  // instantiate lottery contract
  async getLotteryContract(signer?: ethers.Signer) {
    let lotteryContract: ethers.Contract

    if (signer) {
      lotteryContract = new ethers.Contract(
        this.lotteryContractAddress,
        this.lotteryContractJSON.abi,
        signer,
      )
    } else {
      lotteryContract = new ethers.Contract(
        this.lotteryContractAddress,
        this.lotteryContractJSON.abi,
        this.provider,
      )
    }

    return lotteryContract
  }

  // instantiate token contract
  async getLotteryTokenContract(signer?: ethers.Signer) {
    let lotteryTokenContract: ethers.Contract

    if (signer) {
      lotteryTokenContract = new ethers.Contract(
        this.lotteryTokenContractAddress,
        this.lotteryTokenContractJSON.abi,
        signer,
      )
    } else {
      lotteryTokenContract = new ethers.Contract(
        this.lotteryTokenContractAddress,
        this.lotteryTokenContractJSON.abi,
        this.provider,
      )
    }

    return lotteryTokenContract
  }

  // load contract owner
  async loadContractOwner(ethereum: any) {
    // const signer = await this.getMetamaskWalletSigner(ethereum)
    const lotteryContract = await this.getLotteryContract()
    const owner = await lotteryContract['owner']()
    //
    this.contractOwner = await owner
  }

  // is a lottery active
  determineIsCurrentAccountLotteryContractOwner(): Boolean {
    return (
      this.contractOwner.toLowerCase().trim() ===
      this.currentAccount.toLowerCase().trim()
    )
  }

  // betting window open?
  async isBettingWindowOpen() {
    const lotteryContract = await this.getLotteryContract()
    const isLotteryOpen = await lotteryContract['lotteryOpen']()

    const currentlySetLotteryContractClosingEpoch = (
      await lotteryContract['lotteryClosingEpochInSeconds']()
    ).toNumber()
    const captureEpoch = currentEpoch()

    if (
      isLotteryOpen &&
      captureEpoch < currentlySetLotteryContractClosingEpoch
    ) {
      return true
    }
    return false
  }

  // start lottery
  async startLottery(
    ethereum: any,
    closingTime: number,
    BASE_WINNING_FEE_DEPLOY_FRIENDLY_FORMAT: BigNumber,
  ) {
    const currentWallet = await this.getMetamaskWalletSigner(ethereum)

    if (
      (await currentWallet.getAddress()).toLowerCase().trim() !==
      this.contractOwner.toLowerCase().trim()
    ) {
      window.alert('Only owner allowed to start lottery!')
      return
    }

    try {
      const lotteryContract = await this.getLotteryContract()
      const startLotteryTxn = await lotteryContract
        .connect(currentWallet)
        ['startLottery'](closingTime, BASE_WINNING_FEE_DEPLOY_FRIENDLY_FORMAT)

      return [startLotteryTxn.hash]
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // get base winning fee
  async getBaseWinningFee() {
    try {
      const lotteryContract = await this.getLotteryContract()

      const baseWinningClaimFee = await lotteryContract[
        'winningWithdrawBaseFee'
      ]()

      return baseWinningClaimFee
    } catch (error) {
      window.alert(error)
      return undefined
    }
  }

  // get lottery token balance
  async getLotteryTokenBalance(ethereum: any) {
    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const lotteryTokenContract = await this.getLotteryTokenContract()

      const currentAccountTokenBalance = await lotteryTokenContract[
        'balanceOf'
      ](await currentWallet.getAddress())

      return currentAccountTokenBalance
    } catch (error) {
      window.alert('Can not get token balance: ' + `${error}`)
      return ''
    }
  }

  // token purchase
  async purchaseLotteryTokens(
    ethereum: any,
    lotteryTokenAmount: string,
  ): Promise<boolean> {
    let isSuccess = false

    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)

      // run purchase function on lottery contract itself
      const lotteryContract = await this.getLotteryContract()
      const tokenPurchaseTxn = await lotteryContract
        .connect(currentWallet)
        ['sellLotteryTokens']({
          value: ethers.utils.parseEther(lotteryTokenAmount),
        })

      await tokenPurchaseTxn.wait().then(async (response: any) => {
        const { confirmations, logs } = response

        if (
          confirmations > 0 &&
          logs.filter(
            (log: any) => log.address === this.lotteryTokenContractAddress,
          ).length > 0
        ) {
          const lotteryTokenContract = await this.getLotteryTokenContract(
            currentWallet,
          )

          const currentTokenBalance = await lotteryTokenContract['balanceOf'](
            await currentWallet.getAddress(),
          )

          const approveAllowanceToLotteryContractTxn = await lotteryTokenContract
            .connect(currentWallet)
            ['approve'](this.lotteryContractAddress, currentTokenBalance)

          await approveAllowanceToLotteryContractTxn
            .wait()
            .then((response1: any) => {
              if (response1.confirmations > 0) {
                isSuccess = true
              } else {
                isSuccess = false
              }
            })
        }
      })
      return isSuccess
    } catch (error) {
      window.alert(error)
      return isSuccess
    }
  }

  // force allowance
  async forceAllowance(ethereum: any) {
    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const lotteryTokenContract = await this.getLotteryTokenContract(
        currentWallet,
      )

      const currentTokenBalance = await lotteryTokenContract
        .connect(currentWallet)
        ['balanceOf'](await currentWallet.getAddress())

      const approveAllowanceToLotteryContractTxn = await lotteryTokenContract
        .connect(currentWallet)
        ['approve'](this.lotteryContractAddress, currentTokenBalance)

      const approveAllowanceToLotteryContractTxnReceipt = await this.provider.getTransactionReceipt(
        approveAllowanceToLotteryContractTxn.hash,
      )

      if (approveAllowanceToLotteryContractTxnReceipt) return true
      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // token redemption
  async redeemTokensToETH(ethereum: any): Promise<Boolean> {
    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const currentTokenBalance = await this.getLotteryTokenBalance(ethereum)

      const lotteryTokenContract = await this.getLotteryTokenContract()
      const lotteryContract = await this.getLotteryContract()

      const amountToBurn = currentTokenBalance
      const trackBurnTxn = await lotteryContract
        .connect(currentWallet)
        ['trackLatestBurn'](amountToBurn)

      const trackBurnTxnReceipt = await trackBurnTxn.wait()

      if (!(trackBurnTxnReceipt.confirmations > 0)) {
        window.alert('Registering burn with lottery contract failed')
        return false
      }

      const tokenBurnTxn = await lotteryTokenContract
        .connect(currentWallet)
        ['burn'](amountToBurn)

      const tokenBurnTxnReceipt = await tokenBurnTxn.wait()

      if (!(tokenBurnTxnReceipt.confirmations > 0)) {
        window.alert('Token burn with token contract failed')
        return false
      }

      const withdrawBurnTxn = await lotteryContract
        .connect(currentWallet)
        ['withdrawLastBurnToEther']()

      const withdrawBurnTxnReceipt = await withdrawBurnTxn.wait()

      if (!(withdrawBurnTxnReceipt.confirmations > 0)) {
        window.alert(
          'Withdraw burn with token contract failed - ETH has to be manually withdrawn!',
        )
        return false
      }

      return true
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // get accumulated fees
  async getAccumulatedFees() {
    let accumulatedFees: BigNumber

    try {
      const lotteryContract = await this.getLotteryContract()
      accumulatedFees = await lotteryContract['feeCollection']()

      return bigNumberToETHString(accumulatedFees)
    } catch (error) {
      window.alert(error)
      return ''
    }
  }

  // is lottery roll available
  async isLotteryRollAvailable() {
    try {
      const lotteryContract = await this.getLotteryContract()
      const isLotteryOpenForBetting = await lotteryContract['lotteryOpen']()

      const currentlySetLotteryContractClosingEpoch = (
        await lotteryContract['lotteryClosingEpochInSeconds']()
      ).toNumber()
      const captureEpoch = currentEpoch()

      if (
        isLotteryOpenForBetting &&
        currentlySetLotteryContractClosingEpoch < captureEpoch
      ) {
        return true
      }
      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // is lottery start available
  async isLotteryStartAvailable() {
    try {
      const lotteryContract = await this.getLotteryContract()
      const isLotteryOpenForBetting = await lotteryContract['lotteryOpen']()
      return !isLotteryOpenForBetting
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // roll lottery
  async rollLottery(ethereum: any) {
    try {
      const lotteryContract = await this.getLotteryContract()
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)

      const lotteryRollTxn = await lotteryContract
        .connect(currentWallet)
        ['endLottery']()

      const lotteryRollTxnReceipt = await this.provider.getTransactionReceipt(
        lotteryRollTxn.hash,
      )

      if (lotteryRollTxnReceipt) return true
      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // latest lottery winner
  async getLatestLotteryWinner() {
    try {
      const lotteryContract = await this.getLotteryContract()
      const latestLotteryWinner = await lotteryContract['latestLotteryWinner']()
      return latestLotteryWinner
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // get unclaimed winnings for wallet
  async getUnclaimedWinnings(ethereum: any) {
    try {
      const lotteryContract = await this.getLotteryContract()
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const unclaimedWinnings = await lotteryContract['winningStash'](
        await currentWallet.getAddress(),
      )

      return [unclaimedWinnings, bigNumberToETHString(unclaimedWinnings)]
    } catch (error) {
      window.alert(error)
      return []
    }
  }

  // place bets
  async placeBets(ethereum: any) {
    try {
      const lotteryContract = await this.getLotteryContract()
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const placeBetTxn = await lotteryContract.connect(currentWallet)['bet']()

      const placeBetTxnReceipt = await this.provider.getTransactionReceipt(
        placeBetTxn.hash,
      )

      if (placeBetTxnReceipt) return true
      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // get closing epoch time for current pool
  async getClosingEpochTime() {
    try {
      const lotteryContract = await this.getLotteryContract()
      const currentlySetLotteryContractClosingEpoch = (
        await lotteryContract['lotteryClosingEpochInSeconds']()
      ).toNumber()

      return currentlySetLotteryContractClosingEpoch
    } catch (error) {
      window.alert(error)
      return 0
    }
  }

  // claim fee credit
  async claimFeeCredit(ethereum: any) {
    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const lotteryContract = await this.getLotteryContract()

      const claimFeeCreditTxn = await lotteryContract
        .connect(currentWallet)
        ['collectFees']()

      const claimFeeCreditTxnReceipt = await this.provider.getTransactionReceipt(
        claimFeeCreditTxn.hash,
      )

      if (claimFeeCreditTxnReceipt) return true

      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // should winning claim be enabled?
  async shouldWinningClaimBeEnabled(
    unclaimedLotteryWinningBN: ethers.BigNumber,
  ) {
    try {
      const [winningAfterFeeDeduction] = calculateWinningFee(
        unclaimedLotteryWinningBN,
      )

      const lotteryContract = await this.getLotteryContract()

      const baseWinningClaimFee = await lotteryContract[
        'winningWithdrawBaseFee'
      ]()

      return winningAfterFeeDeduction.gt(baseWinningClaimFee)
    } catch (error) {
      window.alert(error)
      return false
    }
  }

  // claim winning
  async claimWinning(ethereum: any): Promise<boolean> {
    try {
      const currentWallet = await this.getMetamaskWalletSigner(ethereum)
      const currentWalletAddress = await currentWallet.getAddress()

      const lotteryContract = await this.getLotteryContract()

      const unclaimedWinningAmount = await lotteryContract['winningStash'](
        currentWalletAddress,
      )

      const [
        winningAmountAfterFeeDeduction,
        calculatedWinningFee,
      ] = calculateWinningFee(unclaimedWinningAmount)

      const baseWinningClaimFee = await lotteryContract[
        'winningWithdrawBaseFee'
      ]()

      if (calculatedWinningFee.gte(baseWinningClaimFee)) {
        const withdrawWinningTxn = await lotteryContract
          .connect(currentWallet)
          ['withdrawWinning'](
            winningAmountAfterFeeDeduction,
            calculatedWinningFee,
          )

        const withdrawWinningTxnReceipt = await withdrawWinningTxn.wait()

        if (withdrawWinningTxnReceipt.confirmations > 0) return true
        return false
      } else {
        const baseFeeCalculatedFeeDelta = baseWinningClaimFee.sub(
          calculatedWinningFee,
        )
        const effectiveWinningAmount = winningAmountAfterFeeDeduction.sub(
          baseFeeCalculatedFeeDelta,
        )

        if (effectiveWinningAmount.lte(ethers.utils.parseEther('0.005'))) {
          window.alert(
            'Winning amount less than fee - try claiming again if you win!',
          )

          return false
        }

        const withdrawWinningTxn = await lotteryContract
          .connect(currentWallet)
          ['withdrawWinning'](
            winningAmountAfterFeeDeduction,
            calculatedWinningFee,
          )

        const withdrawWinningTxnReceipt = await withdrawWinningTxn.wait()

        if (withdrawWinningTxnReceipt.confirmations > 0) return true

        return false
      }

      return false
    } catch (error) {
      window.alert(error)
      return false
    }
  }
}
