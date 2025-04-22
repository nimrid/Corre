import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { Connection, PublicKey } from '@solana/web3.js';

// Solana RPC and token mints
const connection = new Connection('https://api.mainnet-beta.solana.com');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qZFYPiHgBee4jZqxF1vXZZ2VX');
const USDT_MINT = new PublicKey('Es9vMFrzaCERBbMERCj2t5Ju6u2RZkMnDNtDG8oYPka');

export function useWallet() {
  const { 
    user, 
    authenticated 
  } = usePrivy();
  
  const { 
    wallets: solanaWallets,
    createWallet: createSolanaWallet
  } = useSolanaWallets();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({
    USDC: '0.00',
    USDT: '0.00'
  });

  // Get the first Solana wallet or null if none exists
  const wallet = solanaWallets && solanaWallets.length > 0 ? solanaWallets[0] : null;

  // Ensure Solana wallet is created when user is authenticated
  useEffect(() => {
    const setupWallet = async () => {
      if (authenticated && user && !wallet) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Check if Buffer is defined
          if (typeof window !== 'undefined' && !window.Buffer) {
            console.error('Buffer is not defined. Make sure polyfills are loaded.');
            setError('Wallet creation failed: Missing required polyfills. Please refresh the page.');
            return;
          }
          
          await createSolanaWallet();
          console.log('Solana wallet created successfully');
        } catch (err) {
          console.error('Failed to create Solana wallet:', err);

          // If embedded wallet already exists, suppress error
          if (err.message && err.message.includes('User already has an embedded wallet')) {
            console.log('Embedded wallet already exists, ignoring error.');
            setError(null);
            return;
          }

          // Provide more specific error messages
          if (err.message && err.message.includes('Buffer')) {
            setError('Wallet creation failed: Missing required polyfills. Please refresh the page.');
          } else {
            setError('Failed to create wallet. Please try again.');
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    setupWallet();
  }, [authenticated, user, wallet, createSolanaWallet]);

  useEffect(() => {
    if (wallet?.address) {
      const fetchBalances = async () => {
        try {
          setIsLoading(true);
          const ownerPubkey = new PublicKey(wallet.address);
          const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
          let usdcAmt = 0;
          let usdtAmt = 0;
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
          setError(null);
        } catch (err) {
          console.error('Failed to fetch balances:', err);
          setError('Failed to fetch balances. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchBalances();
    }
  }, [wallet]);

  return {
    wallet,
    isLoading,
    error,
    balances,
    createSolanaWallet
  };
} 