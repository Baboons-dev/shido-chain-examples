import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";
import { POSITION_MANAGER_ADDRESS } from "../constants";
import {
  getPoolAddress,
  getTokenInfo,
  getTokenAmounts,
  getPoolData,
} from "../utils/pool";
import PostionManagerAbi from "../abis/positionManager.json";
import poolAbi from "../abis/pool.json";
import { toReadableAmount } from "../utils";

const usePositions = () => {
  const { address, connector } = useAccount();
  const [loading, setLoading] = useState(false);
  const [positionIds, setPositionIds] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [positionLoading, setPositionLoading] = useState(false);

  useEffect(() => {
    const loadPositionIds = async () => {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(
        (await connector?.getProvider()) as any
      );
      const newSigner = provider.getSigner();

      const contract = new ethers.Contract(
        POSITION_MANAGER_ADDRESS,
        PostionManagerAbi,
        newSigner
      );

      const numPositions = await contract.balanceOf(address);

      const positionIds: any = await Promise.all(
        Array.from({ length: Number(numPositions) }, (_, i) =>
          contract.tokenOfOwnerByIndex(address, i)
        )
      );

      setPositionIds(positionIds);
      setLoading(false);
    };

    if (address && connector) {
      loadPositionIds();
    }
  }, [connector, address]);

  const loadPositionData = async (positionId: any) => {
    setPositionLoading(true);

    const provider = new ethers.providers.Web3Provider(
      (await connector?.getProvider()) as any
    );
    const newSigner = provider.getSigner();

    const contract = new ethers.Contract(
      POSITION_MANAGER_ADDRESS,
      PostionManagerAbi,
      newSigner
    );

    // Fetch position data
    const position: any = await contract.positions(positionId);
    const { tickLower, tickUpper, liquidity, token0, token1, fee } = position;

    const [
      poolAddress,
      token0Symbol,
      token1Symbol,
      token0Decimals,
      token1Decimals,
    ]: any = await Promise.all([
      getPoolAddress(provider, token0, token1, fee),
      getTokenInfo(token0, "symbol", provider),
      getTokenInfo(token1, "symbol", provider),
      getTokenInfo(token0, "decimals", provider),
      getTokenInfo(token1, "decimals", provider),
    ]);

    const result: any = await contract.callStatic.collect({
      tokenId: positionId,
      recipient: address,
      amount0Max: ethers.BigNumber.from(2).pow(128).sub(1),
      amount1Max: ethers.BigNumber.from(2).pow(128).sub(1),
    });

    const tokensOwed0 = toReadableAmount(result.amount0, token0Decimals);
    const tokensOwed1 = toReadableAmount(result.amount1, token1Decimals);

    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
    const poolData = await getPoolData(poolContract);

    const isInRange =
      Number(poolData.tick) >= Number(tickLower) &&
      Number(poolData.tick) <= Number(tickUpper);

    const sqrtPriceX96 = BigNumber.from(poolData.sqrtPriceX96).toString();

    const [[pooledToken0, pooledToken1]] = await Promise.all([
      getTokenAmounts(
        Number(liquidity),
        sqrtPriceX96,
        Number(tickLower),
        Number(tickUpper),
        Number(token0Decimals),
        Number(token1Decimals)
      ),
    ]);

    const positionClosed = pooledToken0 === 0 && pooledToken1 === 0;

    const positionData = {
      tickLower,
      tickUpper,
      liquidity: ethers.BigNumber.from(liquidity),
      tokensOwed0: tokensOwed0.toString(),
      tokensOwed1: tokensOwed1.toString(),
      token0,
      token1,
      positionId,
      fee,
      totalLiquidity: poolData.liquidity,
      token0Symbol,
      token1Symbol,
      token0Decimals,
      token1Decimals,
      poolSqrtPrice: poolData.sqrtPriceX96,
      pooledToken0,
      pooledToken1,
      positionClosed,
      isInRange,
      poolTickSpacing: poolData.tickSpacing,
      poolTick: poolData.tick,
    };

    // Update the positions state with the new position data

    setPositions((prev) => [...prev, positionData]);
    setPositionLoading(false);
  };

  return { loading, positionIds, positions, loadPositionData, positionLoading };
};

export default usePositions;
