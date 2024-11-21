import { FC, useState } from "react";
import { ModalProps } from "../types/index";

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
          position={currentPositionId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const LiquidityModal: FC<ModalProps> = ({ position, onClose }) => (
  <div className="modal-overlay">
    <div className="modal">
      <h3>
        {position
          ? `Manage Liquidity for Position #${position}`
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

export default RemoveLiquidity;
