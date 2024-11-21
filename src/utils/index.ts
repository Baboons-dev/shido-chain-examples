import { BigNumber } from "ethers";

import { ethers } from "ethers";

export function fromReadableAmount(amount: BigNumber, decimals: number): any {
  return ethers.utils.parseUnits(amount.toString(), decimals);
}

export function toReadableAmount(
  rawAmount: BigNumber,
  decimals: number
): string {
  return ethers.utils.formatUnits(rawAmount.toString(), decimals);
}
