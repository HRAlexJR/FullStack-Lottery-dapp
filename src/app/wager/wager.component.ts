import { Component, OnInit } from '@angular/core'
import { ContractsService } from '../contracts.service'
import { FormBuilder, Validators } from '@angular/forms'
import { BigNumber, ethers } from 'ethers'
import bigNumberToETHString from '../../helpers/bigNumberToETHString'

declare var window: any

@Component({
  selector: 'app-wager',
  templateUrl: './wager.component.html',
  styleUrls: ['./wager.component.css'],
})
export class WagerComponent implements OnInit {
  isAttemptingToPurchaseTokens: Boolean
  isAttemptingTokenRedemption: Boolean
  isLoadingBalance: Boolean
  isBettingWindowOpen: Boolean
  currentLotteryTokenBalanceForCurrentWallet: string
  currentWalletBalance: string
  unclaimedLotteryWinning: string
  unclaimedLotteryWinningBN: ethers.BigNumber
  isPlacingBet: Boolean
  isClaimingWinning: Boolean
  isForcingAllowance: Boolean
  isWinningClaimable: boolean
  baseWinningFee: string
  betAmount: string
  betFee: string

  buyTokensForm = this.fb.group({
    lotteryTokenAmount: ['', [Validators.required]],
  })

  redeemTokensForm = this.fb.group({
    lotteryTokenAmount: ['', [Validators.required]],
  })

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder,
  ) {
    this.isAttemptingToPurchaseTokens = false
    this.isAttemptingTokenRedemption = false
    this.isLoadingBalance = true
    this.isBettingWindowOpen = false
    this.currentLotteryTokenBalanceForCurrentWallet = ''
    this.currentWalletBalance = ''
    this.unclaimedLotteryWinning = ''
    this.isPlacingBet = false
    this.isClaimingWinning = false
    this.unclaimedLotteryWinningBN = ethers.BigNumber.from(0)
    this.isForcingAllowance = false
    this.isWinningClaimable = false
    this.baseWinningFee = ''
    this.betAmount = '0.5'
    this.betFee = '0.01'
  }

  async ngOnInit(): Promise<void> {
    this.isBettingWindowOpen = await this.contractsService.isBettingWindowOpen()

    const { ethereum } = window
    this.currentLotteryTokenBalanceForCurrentWallet = bigNumberToETHString(
      await this.contractsService.getLotteryTokenBalance(ethereum),
    )
    this.currentWalletBalance = await this.contractsService.getWalletBalance(
      ethereum,
    )
    ;[
      this.unclaimedLotteryWinningBN,
      this.unclaimedLotteryWinning,
    ] = await this.contractsService.getUnclaimedWinnings(ethereum)

    this.isLoadingBalance = false

    this.shouldWinningClaimBeEnabled()

    this.baseWinningFee = ethers.utils.formatEther(
      await this.contractsService.getBaseWinningFee(),
    )
  }

  async shouldWinningClaimBeEnabled() {
    this.isWinningClaimable = await this.contractsService.shouldWinningClaimBeEnabled(
      this.unclaimedLotteryWinningBN,
    )
  }

  async attemptTokenPurchase() {
    this.isAttemptingToPurchaseTokens = true
    const { ethereum } = window

    const { lotteryTokenAmount } = this.buyTokensForm.value

    if (Number.isNaN(parseFloat(lotteryTokenAmount!))) {
      window.alert('Enter valid token amount!')
      this.isAttemptingToPurchaseTokens = false
    }

    const isPurchaseSuccess = await this.contractsService.purchaseLotteryTokens(
      ethereum,
      lotteryTokenAmount!,
    )

    if (isPurchaseSuccess) {
      window.alert('Token purchase successful!')
      await this.ngOnInit()
    } else window.alert('Token purchase unsuccessful - please try later!')
    this.isAttemptingToPurchaseTokens = false
  }

  async attemptTokenRedemption() {
    this.isAttemptingTokenRedemption = true
    const { ethereum } = window

    const ifRedemptionSuccess = await this.contractsService.redeemTokensToETH(
      ethereum,
    )

    if (ifRedemptionSuccess) {
      window.alert('Redemption was successful!')
      await this.ngOnInit()
    } else window.alert('Token redemption failed!')
    this.isAttemptingTokenRedemption = false
  }

  async attemptPlacingBets() {
    this.isPlacingBet = true
    const { ethereum } = window

    const isPlacingBetSuccess = await this.contractsService.placeBets(ethereum)

    if (isPlacingBetSuccess) {
      window.alert('Placed bet successfully!')
    } else window.alert('Placing bet failed!')
    await this.ngOnInit()
    this.isPlacingBet = false
  }

  async attemptWinningClaim() {
    const { ethereum } = window
    this.isClaimingWinning = true

    const isWinningClaimSuccess = await this.contractsService.claimWinning(
      ethereum,
    )

    if (isWinningClaimSuccess) {
      window.alert('Claimed winning successfully!')
      this.isClaimingWinning = false
      this.unclaimedLotteryWinning = ''
      this.ngOnInit()
    } else window.alert('Claiming winning failed!')
    this.isClaimingWinning = false
  }
}
