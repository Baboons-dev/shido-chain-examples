import { type Chain } from "viem";

export const shidoChain: Chain = {
  id: 9008,
  name: "Shido Mainnet",
  nativeCurrency: {
    name: "Shido",
    symbol: "SHIDO",
    decimals: 18,
  },
  rpcUrls: {
    public: { http: ["https://rpc-delta-nodes.shidoscan.com"] },
    default: { http: ["https://rpc-delta-nodes.shidoscan.com"] },
  },
  blockExplorers: {
    default: { name: "ShidoScan", url: "https://shidoscan.com" },
  },
  testnet: false,
};
