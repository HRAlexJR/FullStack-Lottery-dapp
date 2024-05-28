import { Component, OnInit } from '@angular/core'
import currentEpoch from '../../helpers/currentEpoch'
import { ContractsService } from '../contracts.service'

declare var window: any

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit {
  lotteryContractAddress: string
  isBettingWindowOpen: Boolean
  isLotteryRollAvailable: Boolean
  isAttemptingLotteryRoll: Boolean
  latestLotteryWinner: string
  lotteryTimeWindowCountdown: string
  closingTimeString: string
  closingEpochInSeconds: number

  constructor(private contractsService: ContractsService) {
    this.lotteryContractAddress = ''
    this.isBettingWindowOpen = false
    this.isLotteryRollAvailable = false
    this.isAttemptingLotteryRoll = false
    this.latestLotteryWinner = ''
    this.lotteryTimeWindowCountdown = ''
    this.closingEpochInSeconds = 0
    this.closingTimeString = ''
  }

  async ngOnInit(): Promise<void> {
    this.lotteryContractAddress = this.contractsService.lotteryContractAddress
    this.isBettingWindowOpen = await this.contractsService.isBettingWindowOpen()
    this.isLotteryRollAvailable = await this.contractsService.isLotteryRollAvailable()
    this.latestLotteryWinner = await this.contractsService.getLatestLotteryWinner()
    this.closingEpochInSeconds = await this.contractsService.getClosingEpochTime()
    this.closingTimeString = new Date(
      this.closingEpochInSeconds * 1000,
    ).toISOString()
  }

  async rollLottery() {
    this.isAttemptingLotteryRoll = true
    const { ethereum } = window
    const isLotteryRollSuccess = await this.contractsService.rollLottery(
      ethereum,
    )
    if (isLotteryRollSuccess) {
      window.alert('Lottery roll successful!')
      await this.ngOnInit()
    }
    this.isAttemptingLotteryRoll = false
  }
}
