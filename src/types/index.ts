export type TokenData = {
  symbol: string;
  name: string;
  decimals: number;
};

export type Action = "mint" | "increase" | "remove" | null;
export type ModalProps = {
  position: any;
  onClose: () => void;
};
export type PoolData = {
  token0: string;
  token1: string;
  tick: string;
  sqrtPriceX96: string;
  fee: number;
  liquidity: number;
};

// Define the type for exchange rates
export type ExchangeRates = {
  token1: number;
  token0: number;
};
