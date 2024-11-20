import { ethers, Signer } from "ethers";
import React, { useState, ChangeEvent, FC, useEffect } from "react";
import poolAbi from "../abis/pool.json";
import { useAccount } from "wagmi";
import {
  createPosition,
  getPoolData,
  getPrice,
  getTokenData,
} from "../utils/pool";
import { erc20Abi } from "viem";
import {
  TokenData,
  PoolData,
  Action,
  ExchangeRates,
  ModalProps,
} from "../types/index";

const PoolPage: FC = () => {
  const [poolId, setPoolId] = useState<string>(""); // State for Pool ID input
  const [poolData, setPoolData] = useState<PoolData | null>(null); // State for storing pool data
  const [loading, setLoading] = useState<boolean>(false); // State to track loading status
  const [selectedAction, setSelectedAction] = useState<Action>(null); // State for selected action
  const [signer, setSigner] = useState<any>(null); // State for signer
  const { connector } = useAccount(); // Get account connector from wagmi
  const [token0, setToken0] = useState<TokenData | null>(null);
  const [token1, setToken1] = useState<TokenData | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    token0: 0,
    token1: 0,
  });

  useEffect(() => {
    const loadSigner = async () => {
      const rawProvider: any = await connector?.getProvider(); // Get raw provider
      const provider = new ethers.providers.Web3Provider(rawProvider); // Create a Web3 provider

      const newSigner = provider.getSigner(); // Get signer from provider
      setSigner(newSigner); // Set signer state
    };

    if (connector) {
      loadSigner(); // Load signer if provider is available
    }
  }, [connector]);

  const handlePoolIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPoolId(e.target.value); // Update pool ID state on input change
  };

  const handleLoadDetails = async () => {
    if (!signer) return; // Exit if signer is not available

    setLoading(true); // Set loading state to true
    console.log(`Loading details for Pool ID: ${poolId}`);
    const poolContract = new ethers.Contract(poolId, poolAbi, signer); // Create contract instance

    const poolDetails = await getPoolData(poolContract); // Fetch pool data
    setPoolData(poolDetails); // Update pool data state
    setLoading(false); // Set loading state to false after data is fetched
  };

  useEffect(() => {
    // Function to load token details for token0 and token1
    const loadTokenDetails = async () => {
      // Exit if signer or poolData is not available
      if (!signer || !poolData) return;

      // Create contract instances for token0 and token1 using their addresses and the signer
      const token0Contract = new ethers.Contract(
        poolData?.token0, // Address of token0
        erc20Abi, // ABI for ERC20 token
        signer // Signer to interact with the contract
      );
      const token1Contract = new ethers.Contract(
        poolData?.token1, // Address of token1
        erc20Abi, // ABI for ERC20 token
        signer // Signer to interact with the contract
      );

      // Fetch token details for both tokens concurrently
      const [token0Details, token1Details] = await Promise.all([
        getTokenData(token0Contract), // Fetch details for token0
        getTokenData(token1Contract), // Fetch details for token1
      ]);

      // Update state with the fetched token details
      setToken0(token0Details); // Set state for token0 details
      setToken1(token1Details); // Set state for token1 details
    };

    // Trigger loadTokenDetails if both token0 and token1 are available in poolData
    if (poolData?.token0 && poolData.token1) {
      loadTokenDetails(); // Call the function to load token details
    }
  }, [poolData]); // Dependency array: effect runs when poolData changes

  useEffect(() => {
    if (token0 && token1 && poolData) {
      const exchangeRates = getPrice({
        sqrtPriceX96: poolData.sqrtPriceX96,
        Decimal0: token1.decimals,
        Decimal1: token0.decimals,
      });

      setExchangeRates(exchangeRates);
    }
  }, [token0, token1]);

  return (
    <div className="container">
      <h1 className="header">Pool Management</h1>
      <div className="input-group">
        <input
          type="text"
          value={poolId}
          onChange={handlePoolIdChange}
          placeholder="Enter Pool ID"
          className="input"
        />
        <button
          className="button"
          onClick={handleLoadDetails}
          disabled={!signer || loading} // Disable button if loading or signer is not available
        >
          Load Pool
        </button>
      </div>

      {poolData && (
        <div className="pool-details">
          <h2>Pool Information</h2>
          <p>
            <strong>Pool ID:</strong> {poolId}
          </p>

          <p>
            <strong>Fee Tier:</strong> {poolData.fee / 10000}%
          </p>
          <p>
            <strong>Total Liquidity:</strong> {poolData.liquidity}
          </p>

          <div className="token-details">
            <h3>Token 0</h3>
            <p>
              <strong>Address:</strong> {poolData.token0}
            </p>
            <p>
              <strong>symbol:</strong> {token0?.symbol}
            </p>

            <p>
              <strong>name:</strong> {token0?.name}
            </p>
            <p>
              <strong>decimals:</strong> {token0?.decimals}
            </p>
          </div>
          <div className="token-details">
            <h3>Token 1</h3>
            <p>
              <strong>Address:</strong> {poolData.token1}
            </p>

            <p>
              <strong>symbol:</strong> {token1?.symbol}
            </p>

            <p>
              <strong>name:</strong> {token1?.name}
            </p>
            <p>
              <strong>decimals:</strong> {token1?.decimals}
            </p>
          </div>
        </div>
      )}

      <div className="button-group">
        <button className="button" onClick={() => setSelectedAction("mint")}>
          Mint New Position
        </button>
        <button
          className="button"
          onClick={() => setSelectedAction("increase")}
        >
          Increase Liquidity
        </button>
        <button className="button" onClick={() => setSelectedAction("remove")}>
          Remove Liquidity
        </button>
      </div>
      <div style={{ marginTop: "30px" }}>
        {selectedAction === "mint" && (
          <MintPositionForm
            poolData={poolData}
            exchangeRates={exchangeRates}
            signer={signer}
            token0={token0}
            token1={token1}
          />
        )}
        {selectedAction === "increase" && <IncreaseLiquidity />}
        {selectedAction === "remove" && <RemoveLiquidity />}
      </div>
    </div>
  );
};

// Update MintPositionForm to accept exchangeRates as a prop
const MintPositionForm: FC<{
  poolData: PoolData | null;
  exchangeRates: ExchangeRates;
  signer: Signer;
  token0: TokenData | null;
  token1: TokenData | null;
}> = ({ poolData, exchangeRates, signer, token0, token1 }) => {
  const [token0Amount, setToken0Amount] = useState<number>(); // State for Token 0 amount
  const [token1Amount, setToken1Amount] = useState<number>(); // State for Token 1 amount
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // State for success message
  const [transactionHash, setTransactionHash] = useState<string | undefined>(
    undefined
  ); // State for transaction hash
  const [loading, setLoading] = useState<boolean>(false); // State for loading effect

  const handleToken0Change = (e: ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    setToken0Amount(amount);
    setToken1Amount(amount * exchangeRates.token0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setError("");
    setSuccessMessage("");
    setTransactionHash("");

    e.preventDefault(); // Prevent default form submission
    if (!poolData || !token0Amount || !token1Amount) {
      setError("Please enter valid amounts."); // Set error if amounts are invalid
      return;
    }

    setLoading(true); // Set loading state to true
    try {
      // Convert token amounts to BigNumber using their decimals
      const token0BigNumber = ethers.utils.parseUnits(
        token0Amount.toString(),
        token0?.decimals
      );
      const token1BigNumber = ethers.utils.parseUnits(
        token1Amount.toString(),
        token1?.decimals
      );

      // Call createPosition function (import it from utils)
      const tx = await createPosition(
        signer,
        poolData.fee,
        token0BigNumber,
        token1BigNumber,
        token0,
        token1,
        poolData
      );
      if (tx) {
        setTransactionHash(tx.hash); // Store transaction hash
        setSuccessMessage("Position created successfully!"); // Set success message
      }
      setError(null); // Clear error on success
      setSuccessMessage("");
    } catch (err: any) {
      console.log(err);
      setError(err.message || "An error occurred while creating the position."); // Set error message
      setSuccessMessage("");
    } finally {
      setLoading(false); // Set loading state to false after process ends
      setToken0Amount(0);
      setToken1Amount(0);
    }
  };

  return (
    <div>
      <h2>Mint New Position</h2>
      {loading && <p className="loading">Minting in progress...</p>}{" "}
      {/* Display loading message */}
      {error && <p className="error">{error}</p>} {/* Display error message */}
      {successMessage && (
        <p className="success">{successMessage}</p> // Display success message
      )}
      {transactionHash && (
        <p>
          Transaction Hash:{" "}
          <a
            href={`https://shidoscan.com/tx/${transactionHash}`} // Link to transaction on ShidoScan
            target="_blank"
            rel="noopener noreferrer"
          >
            {transactionHash}
          </a>
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {" "}
        {/* Handle form submission */}
        <div style={{ marginBottom: "10px" }}>
          <label>Token 0 Amount: </label>
          <input
            step={0.00000001}
            type="number"
            className="input"
            value={token0Amount} // Bind input value to state
            onChange={handleToken0Change} // Update state on change
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Token 1 Amount: </label>
          <input
            step={0.0000001}
            type="number"
            className="input"
            value={token1Amount} // Bind input value to state
            disabled
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          Add Position
        </button>
      </form>
    </div>
  );
};

const IncreaseLiquidity: FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentPositionId, setCurrentPositionId] = useState<number | null>(
    null
  );

  const openModal = (id: number) => {
    setCurrentPositionId(id);
    setShowModal(true);
  };

  return (
    <div>
      <h2>Increase Liquidity</h2>
      <ul>
        <li>
          Position #1{" "}
          <button className="button" onClick={() => openModal(1)}>
            Increase
          </button>
        </li>
        <li>
          Position #2{" "}
          <button className="button" onClick={() => openModal(2)}>
            Increase
          </button>
        </li>
      </ul>
      {showModal && (
        <LiquidityModal
          positionId={currentPositionId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const RemoveLiquidity: FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentPositionId, setCurrentPositionId] = useState<number | null>(
    null
  );

  const openModal = (id: number) => {
    setCurrentPositionId(id);
    setShowModal(true);
  };

  return (
    <div>
      <h2>Remove Liquidity</h2>
      <ul>
        <li>
          Position #1{" "}
          <button className="button" onClick={() => openModal(1)}>
            Decrease
          </button>
        </li>
        <li>
          Position #2{" "}
          <button className="button" onClick={() => openModal(2)}>
            Decrease
          </button>
        </li>
      </ul>
      {showModal && (
        <LiquidityModal
          positionId={currentPositionId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const LiquidityModal: FC<ModalProps> = ({ positionId, onClose }) => (
  <div className="modal-overlay">
    <div className="modal">
      <h3>
        {positionId
          ? `Manage Liquidity for Position #${positionId}`
          : "Manage Liquidity"}
      </h3>
      <form>
        <div style={{ marginBottom: "10px" }}>
          <label>Token 0 Amount: </label>
          <input type="number" className="input" />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Token 1 Amount: </label>
          <input type="number" className="input" />
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

export default PoolPage;
