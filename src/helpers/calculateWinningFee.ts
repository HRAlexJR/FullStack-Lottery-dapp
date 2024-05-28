import { BigNumber, utils } from 'ethers'

const calculatePercentageOfBigNumber = (
  amount: BigNumber,
  percentage: number,
) => {
  //  convert percentage to BigNumber
  const percentageInBigNumber = BigNumber.from(percentage)

  // multiple the amount by the percentage
  const multiplyAmountByPercentage = amount.mul(percentageInBigNumber)

  // get ether string for above big number
  const getEtherStringFromPercentageNumeratorMultipliedBigNumber = utils.formatEther(
    multiplyAmountByPercentage,
  )

  // 1ETH => 18 zeros, 1ETH/100 => 16 zeros
  const offsetDecimalsForPercentageDivision = utils.parseUnits(
    getEtherStringFromPercentageNumeratorMultipliedBigNumber,
    16,
  )

  return offsetDecimalsForPercentageDivision
}

// export default (winningAmount: ethers.BigNumber): ethers.BigNumber[] => {
export default (
  winningAmount: BigNumber,
  feePercent: number = 30,
): BigNumber[] => {
  const winningFee = calculatePercentageOfBigNumber(winningAmount, feePercent)

  const winningAfterFeeDeduction = winningAmount.sub(winningFee)

  return [winningAfterFeeDeduction, winningFee]
}
