import { useState, useEffect } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { Connection, PublicKey } from '@solana/web3.js';

// Solana RPC and token mints
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL ||
  'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166'
);
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Native USDC
const USDT_MINT = new PublicKey('Es9vMFrzaCERBbMERCj2t5Ju6u2RZkMnDNtDG8oYPka');

export function useWallet() {
  const userContext = useUser();
  const user = userContext?.user;
  const authStatus = userContext?.authStatus;
  const authError = userContext?.error;
  const createWalletFunc = userContext?.createWallet;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({
    USDC: '0.00',
    USDT: '0.00'
  });

  // Civic embedded wallet detection (handles USDC, USDT, SOL, etc)
  // userContext.sol is the Civic embedded Solana wallet object (not SOL the token)
  // It exposes sendTransaction for all SPL tokens, including USDC
  const embeddedWallet = userContext?.sol?.wallet ?? null;
  const directSolWallet = userContext?.sol ?? null;
  const solanaWallet = embeddedWallet || directSolWallet || userContext?.solana || null;
  const wallet = solanaWallet;

  // Auto-create embedded wallet on mount if missing
  useEffect(() => {
    if (createWalletFunc && !solanaWallet) {
      createWalletFunc();
    }
  }, [createWalletFunc, solanaWallet]);

  useEffect(() => {
    if (authStatus === 'authenticated' && user && wallet == null && createWalletFunc) {
      createWalletFunc();
    }
  }, [authStatus, user, wallet, createWalletFunc]);

  useEffect(() => {
    if (!wallet?.address) return;
    const fetchBalances = async () => {
      try {
        setIsLoading(true);
        const ownerPubkey = new PublicKey(wallet.address);
        const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
        let usdcAmt = 0;
        let usdtAmt = 0;
        console.log('Token accounts found:', resp.value.map(({ account }) => ({
          mint: account.data.parsed.info.mint,
          amount: account.data.parsed.info.tokenAmount?.uiAmount,
          raw: account
        })));
        resp.value.forEach(({ account }) => {
          const info = account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount?.uiAmount || 0;
          if (mint === USDC_MINT.toBase58()) usdcAmt = amount;
          else if (mint === USDT_MINT.toBase58()) usdtAmt = amount;
        });
        setBalances({
          USDC: usdcAmt.toFixed(2),
          USDT: usdtAmt.toFixed(2)
        });
      } catch (err) {
        console.error('Failed to fetch balances:', err);
        setError('Failed to fetch balances. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBalances();
  }, [wallet]);

  return {
    wallet,
    isLoading,
    error: authError || error,
    balances
  };
}