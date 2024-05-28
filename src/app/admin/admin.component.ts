import { Component, OnInit } from '@angular/core'
import { ContractsService } from '../contracts.service'
import { FormBuilder, Validators } from '@angular/forms'

import { NgZone } from '@angular/core'
import { Router } from '@angular/router'

import { ethers } from 'ethers'
import currentEpoch from 'src/helpers/currentEpoch'

declare var window: any

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  isOwnerLoggedIn: Boolean
  isAttemptingLotteryStart: Boolean
  isLoadingAccumulatedFees: Boolean
  accumulatedFees: string
  isLotteryStartAvailable: Boolean
  ownerLotteryTokenBalance: string
  currentWalletBalance: string
  isAttemptingFeeCredit: Boolean

  startLotteryForm = this.fb.group({
    durationInSeconds: ['', [Validators.required]],
    baseWinningWithdrawFee: ['', [Validators.required]],
  })

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder,
    private ngZone: NgZone,
    private router: Router,
  ) {
    this.isOwnerLoggedIn = false
    this.isAttemptingLotteryStart = false
    this.isLoadingAccumulatedFees = false
    this.accumulatedFees = ''
    this.isLotteryStartAvailable = false
    this.ownerLotteryTokenBalance = ''
    this.currentWalletBalance = ''
    this.isAttemptingFeeCredit = false
  }

  async ngOnInit(): Promise<void> {
    const { ethereum } = window
    await this.contractsService.checkWalletConnection(ethereum)
    await this.contractsService.loadContractOwner(ethereum)
    this.isOwnerLoggedIn = this.contractsService.determineIsCurrentAccountLotteryContractOwner()
    this.accumulatedFees = await this.contractsService.getAccumulatedFees()
    this.isLotteryStartAvailable = await this.contractsService.isLotteryStartAvailable()

    this.ownerLotteryTokenBalance = ethers.utils.formatEther(
      await this.contractsService.getLotteryTokenBalance(ethereum),
    )
    this.currentWalletBalance = await this.contractsService.getWalletBalance(
      ethereum,
    )
  }

  async attemptLotteryStart() {
    this.isAttemptingLotteryStart = true

    const { ethereum } = window
    const {
      durationInSeconds,
      baseWinningWithdrawFee,
    } = this.startLotteryForm.value

    if (!durationInSeconds || !baseWinningWithdrawFee) {
      window.alert('Form not correctly filled - try again!')
      this.isAttemptingLotteryStart = false
      return
    }

    const computedClosingTime = currentEpoch() + parseInt(durationInSeconds!)

    const isStartLotterySuccess = await this.contractsService.startLottery(
      ethereum,
      computedClosingTime,
      ethers.utils.parseEther(baseWinningWithdrawFee!),
    )

    if (isStartLotterySuccess) {
      window.alert('New lottery started!')
      this.isAttemptingLotteryStart = false
      this.ngZone.run(() => this.router.navigate(['/']))
    }

    this.isAttemptingLotteryStart = false
  }

  async attemptFeeCredit() {
    this.isAttemptingFeeCredit = true
    const { ethereum } = window
    const isFeeCreditSuccess = await this.contractsService.claimFeeCredit(
      ethereum,
    )

    if (isFeeCreditSuccess) {
      window.alert('Accumulated fees credit to owner!')
      await this.ngOnInit()
    }
    this.isAttemptingFeeCredit = false
  }
}
