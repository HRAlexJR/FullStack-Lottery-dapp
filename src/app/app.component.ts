import { Component } from '@angular/core'
import { ContractsService } from './contracts.service'

declare var window: any

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'client'
  isWalletLoggedIn: Boolean

  constructor(private contractsService: ContractsService) {
    this.isWalletLoggedIn = false

    const { ethereum } = window
    this.contractsService.checkWalletConnection(ethereum).then((data0) => {
      if (data0) {
        this.isWalletLoggedIn = true
      }
    })

    this.contractsService.loadContractOwner(ethereum)

    // handle change of wallet account
    ethereum.on('accountsChanged', () => {
      location.reload()
    })
  }

  // connect to metamask wallet on button click
  async connectMetamaskWallet() {
    this.isWalletLoggedIn = this.contractsService.isLoggedIn

    if (!this.isWalletLoggedIn) {
      const { ethereum } = window
      await this.contractsService.checkWalletConnection(ethereum)
      await this.contractsService.connectToWallet(ethereum)
      this.isWalletLoggedIn = this.contractsService.isLoggedIn
      window.alert('Connected to Wallet!')
    }
  }
}
