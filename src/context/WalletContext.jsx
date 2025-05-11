import React, { createContext, useContext } from 'react';
import { useUser } from '@civic/auth-web3/react';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { solana } = useUser();
  // solana.wallet.publicKey is the Civic embedded wallet address (if logged in)
  const walletAddress = solana?.wallet?.publicKey?.toBase58() || null;
  const wallet = solana?.wallet || null;

  return (
    <WalletContext.Provider value={{ walletAddress, wallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
