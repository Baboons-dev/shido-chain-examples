import React, { ReactNode } from "react";
import { WagmiProvider, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { shidoChain } from "../chains";

const config = createConfig(
  // @ts-ignore
  getDefaultConfig({
    chains: [shidoChain],
    walletConnectProjectId: "ac6818d713537310b1b5435748cba3f4",
    appName: "Shido",
  })
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider debugMode>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
