import { ethers } from 'ethers'

export default (eth: ethers.BigNumber) =>
  ethers.utils.formatEther(eth.toString())
