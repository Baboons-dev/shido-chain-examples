import { Percent, Token } from "@vivektamilarasan/sdk-core";
import { PoolData, TokenData } from "../types";
import {
  FeeAmount,
  nearestUsableTick,
  Pool,
  Position,
  TICK_SPACINGS,
  TickMath,
  MintOptions,
  NonfungiblePositionManager,
} from "@uniswap/v3-sdk";
import { BigNumber, BigNumberish, ethers, Signer, Transaction } from "ethers";
import { erc20Abi } from "viem";
import { POSITION_MANAGER_ADDRESS } from "../constants";

/**
 * Represents the information of a pool.
 */
interface PoolInfo {
  sqrtPriceX96: string; // The square root price of the pool in X96 format
  Decimal0: number; // Decimal places for token0
  Decimal1: number; // Decimal places for token1
}

/**
 * Checks and sets approval for a given token if the allowance is insufficient.
 *
 * @param tokenContract - The contract instance of the token to check approval for.
 * @param spender - The address that will spend the tokens (e.g., swap router address).
 * @param amount - The amount of tokens to approve.
 * @param signer - The signer to use for the transaction.
 * @returns A promise that resolves to the transaction response if approval is needed.
 */
export const checkAndApproveToken = async (
  tokenContract: any,
  spender: string,
  amount: BigNumber,
  signer: Signer
): Promise<Transaction | undefined> => {
  const allowance = await tokenContract.allowance(
    await signer.getAddress(),
    spender
  );

  if (allowance.lt(amount)) {
    const approvalTx = await tokenContract.approve(spender, amount);
    await approvalTx.wait(); // Wait for the transaction to be mined
    return approvalTx; // Return the approval transaction response
  }
  return undefined; // No approval needed
};

/**
 * Fetches data from a given pool contract.
 *
 * @param poolContract - The contract instance of the pool from which to fetch data.
 * @returns An object containing the pool's token addresses, tick spacing, fee, liquidity,
 *          square root price, and current tick.
 */
export const getPoolData = async (poolContract: any) => {
  const [token0, token1, tickSpacing, fee, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.tickSpacing(),
      poolContract.fee(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

  return {
    token0: token0,
    token1: token1,
    tickSpacing: tickSpacing.toString(),
    fee: fee,
    liquidity: liquidity.toString(),
    sqrtPriceX96: slot0[0].toString(),
    tick: slot0[1].toString(),
  };
};

/**
 * Calculates the price of token0 and token1 based on the pool information.
 *
 * @param PoolInfo - An object containing the pool's square root price and decimal information.
 * @returns An object containing the calculated prices for token0 and token1.
 */
export const getPrice = (PoolInfo: PoolInfo) => {
  let sqrtPriceX96 = Number(PoolInfo.sqrtPriceX96); // Extract square root price
  let Decimal1 = PoolInfo.Decimal1; // Extract decimal for token1
  let Decimal0 = PoolInfo.Decimal0; // Extract decimal for token0

  // Calculate the amount based on the decimals
  const amount: any = (10 ** Decimal0 / 10 ** Decimal1).toFixed(Decimal0);
  const buyOneOfToken0 = (sqrtPriceX96 / 2 ** 96) ** 2 / amount; // Price of one token0
  const buyOneOfToken1: any = (1 / buyOneOfToken0).toFixed(Decimal1); // Price of one token1

  return {
    token1: Number(buyOneOfToken1.toString()), // Return price of token1
    token0: Number(buyOneOfToken0.toString()), // Return price of token0
  };
};

export const getTokenData = async (tokenContract: any) => {
  // Fetch the token's symbol, name, and decimals concurrently
  const [symbol, name, decimals] = await Promise.all([
    tokenContract.symbol(), // Fetch the token symbol
    tokenContract.name(), // Fetch the token name
    tokenContract.decimals(), // Fetch the number of decimals for the token
  ]);

  // Return an object containing the token's symbol, name, and decimals
  return {
    symbol,
    name,
    decimals,
  };
};

export const createPosition = async (
  signer: Signer,
  fee: FeeAmount,
  token0DepositAmount: BigNumber,
  token1DepositAmount: BigNumber,
  token0: TokenData | null,
  token1: TokenData | null,
  poolData: PoolData
): Promise<Transaction | undefined> => {
  // Check if both tokens are provided
  if (token0 && token1) {
    try {
      // Create token instances for token0 and token1
      const tokenA = new Token(
        9008,
        poolData.token0,
        token0.decimals,
        token0.symbol,
        token0.name
      );
      const tokenB = new Token(
        9008,
        poolData.token1,
        token1.decimals,
        token1.symbol,
        token1.name
      );

      // Create contract instances for token0 and token1
      const token0Contract = new ethers.Contract(
        tokenA.address,
        erc20Abi,
        signer
      );
      const token1Contract = new ethers.Contract(
        tokenB.address,
        erc20Abi,
        signer
      );

      // Check and set approval for both tokens
      await checkAndApproveToken(
        token0Contract,
        POSITION_MANAGER_ADDRESS,
        token0DepositAmount,
        signer
      );
      await checkAndApproveToken(
        token1Contract,
        POSITION_MANAGER_ADDRESS,
        token1DepositAmount,
        signer
      );

      // Configure the pool with the provided tokens and data
      const configuredPool = new Pool(
        tokenA,
        tokenB,
        Number(poolData.fee),
        poolData.sqrtPriceX96,
        poolData.liquidity,
        Number(poolData.tick.toString())
      );

      // Determine the lower and upper ticks for the position
      const tickLower = nearestUsableTick(
        TickMath.MIN_TICK,
        TICK_SPACINGS[fee as FeeAmount]
      );

      const tickUpper = nearestUsableTick(
        TickMath.MAX_TICK,
        TICK_SPACINGS[fee as FeeAmount]
      );

      // Ensure valid tick range
      if (tickLower && tickUpper) {
        // Create a position based on the configured pool and amounts
        const position = Position.fromAmounts({
          pool: configuredPool,
          tickLower: tickLower,
          tickUpper: tickUpper,
          amount0: token0DepositAmount.toString(),
          amount1: token1DepositAmount.toString(),
          useFullPrecision: true,
        });

        // Set minting options for the position
        const mintOptions: MintOptions = {
          recipient: await signer.getAddress(),
          deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
          slippageTolerance: new Percent(50, 10_000), // 0.5% slippage tolerance
        };

        // Get calldata for minting a position
        const { calldata, value } =
          NonfungiblePositionManager.addCallParameters(position, mintOptions);

        // Prepare the transaction object
        const transaction: any = {
          data: calldata,
          to: POSITION_MANAGER_ADDRESS, // Address of the NonfungiblePositionManager
          value: value,
          from: await signer.getAddress(),
        };

        // Estimate gas for the transaction and add a buffer
        const estimatedGas = await signer.estimateGas(transaction);
        const gasLimit = estimatedGas.mul(120).div(100); // 20% buffer

        transaction["gasLimit"] = gasLimit;

        // Send the transaction
        const tx = await signer.sendTransaction(transaction);

        return tx; // Return the transaction response
      } else {
        throw new Error("Invalid price range"); // Handle invalid tick range
      }
    } catch (error: any) {
      throw error; // Rethrow any caught errors
    }
  }
};
