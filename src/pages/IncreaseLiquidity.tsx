import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FC } from "react";
import { ExchangeRates, ModalProps } from "../types/index";
import usePositions from "../hooks/usePositions";
import { addLiquidity, getPrice } from "../utils/pool";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

const IncreaseLiquidity: FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentPositionId, setCurrentPosition] = useState<any>(null);
  const { positionIds, loadPositionData, positions } = usePositions();

  // Load positions for the current page
  useEffect(() => {
    const loadPositions = async () => {
      // Load data for each position ID
      await Promise.all(positionIds.map((id) => loadPositionData(id)));
    };

    if (positionIds.length > 0) {
      loadPositions();
    }
  }, [positionIds]);

  const openModal = (position: any) => {
    setCurrentPosition(position);
    setShowModal(true);
  };

  return (
    <div className="increase-liquidity">
      <h2>Increase Liquidity</h2>

      <table className="positions-table">
        <thead>
          <tr>
            <th>Position ID</th>
            <th>Token Pair</th>
            <th>Fee Tier</th>
            <th>Status</th>
            <th>Pooled Tokens</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => (
            <tr
              key={index}
              className={position.isInRange ? "in-range" : "out-of-range"}
            >
              <td>{position.positionId.toString()}</td>
              <td>
                {position.token0Symbol}/{position.token1Symbol}
              </td>
              <td>{position.fee}</td>
              <td>{position.positionClosed ? "Closed" : "Open"}</td>
              <td>
                {position.pooledToken0} {position.token0Symbol} /{" "}
                {position.pooledToken1} {position.token1Symbol}
              </td>
              <td>
                {position.isInRange && !position.positionClosed && (
                  <button
                    className="manage-button"
                    onClick={() => openModal(position)}
                  >
                    Add liquidity
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <LiquidityModal
          position={currentPositionId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const LiquidityModal: FC<ModalProps> = ({ position, onClose }) => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    token0: 0,
    token1: 0,
  });
  const [token0Amount, setToken0Amount] = useState<number>(); // State for Token 0 amount
  const [token1Amount, setToken1Amount] = useState<number>(); // State for Token 1 amount
  const { connector } = useAccount(); // Get account connector from wagmi

  const handleToken0Change = (e: ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    setToken0Amount(amount);
    setToken1Amount(amount * exchangeRates.token0);
  };

  useEffect(() => {
    if (position) {
      const exchangeRates = getPrice({
        sqrtPriceX96: position.poolSqrtPrice,
        Decimal0: position.token1Decimals,
        Decimal1: position.token0Decimals,
      });

      setExchangeRates(exchangeRates);
    }
  }, [position]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    const rawProvider: any = await connector?.getProvider(); // Get raw provider
    const provider = new ethers.providers.Web3Provider(rawProvider); // Create a Web3 provider

    const signer = provider.getSigner();

    if (position && token0Amount && token1Amount) {
      try {
        // Call addLiquidity function here
        const tx = await addLiquidity(
          position, // Pass the position
          signer, // Ensure you have the signer available
          position.positionId, // Pass the position ID
          token0Amount, // Amount for token0
          token1Amount // Amount for token1
        );
        console.log("Liquidity updated:", tx);
        alert("Liquidity added successfully!");
        onClose();
      } catch (error: any) {
        console.error("Error updating liquidity:", error);
        alert("Error adding liquidity. Please try again. " + error.message);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>
          {position
            ? `Manage Liquidity for Position #${position.positionId.toString()}`
            : "Manage Liquidity"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label>{position.token0Symbol}: </label>
            <input
              step={0.00000001}
              type="number"
              className="input"
              value={token0Amount} // Bind input value to state
              onChange={handleToken0Change} // Update state on change
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>{position.token1Symbol}:</label>
            <input
              step={0.0000001}
              type="number"
              className="input"
              value={token1Amount} // Bind input value to state
              disabled
            />
          </div>
          <button className="button" type="submit">
            Update Liquidity
          </button>
        </form>
        <button
          className="button"
          style={{ marginTop: "10px" }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default IncreaseLiquidity;
