import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const { wallets: solanaWallets, createWallet: createSolanaWallet } = useSolanaWallets();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the first Solana wallet or null if none exists
  const wallet = solanaWallets && solanaWallets.length > 0 ? solanaWallets[0] : null;

  // Ensure a Solana wallet exists for the user
  const ensureWallet = async () => {
    if (!wallet && user) {
      try {
        if (typeof window !== 'undefined' && !window.Buffer) {
          console.error('Buffer is not defined. Make sure polyfills are loaded.');
          setError('Wallet creation failed: Missing required polyfills. Please refresh the page.');
          return;
        }
        await createSolanaWallet();
        console.log('Solana wallet created successfully');
        setError(null);
      } catch (err) {
        console.error('Failed to create Solana wallet:', err);
        if (solanaWallets && solanaWallets.length > 0) {
          console.log('Wallet exists after error, suppressing error message.');
          setError(null);
          return;
        }
        if (err.message && err.message.includes('Buffer')) {
          setError('Wallet creation failed: Missing required polyfills. Please refresh the page.');
        } else if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
          setError('Network timeout. Please check your connection and try again.');
        } else {
          setError('Failed to create wallet. Please try again.');
        }
      }
    }
  };

  // Redirect on authentication
  useEffect(() => {
    if (authenticated) navigate('/dashboard');
  }, [authenticated, navigate]);

  // When authenticated and user exists, ensure wallet is created
  useEffect(() => {
    if (authenticated && user) ensureWallet();
  }, [authenticated, user]);

  // Login handler
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (typeof window !== 'undefined' && !window.Buffer) {
        console.error('Buffer is not defined. Make sure polyfills are loaded.');
        setError('Login failed: Missing required polyfills. Please refresh the page.');
        return;
      }
      await login();
    } catch (err) {
      console.error('Login failed:', err);
      if (err.message && err.message.includes('Buffer')) {
        setError('Login failed: Missing required polyfills. Please refresh the page.');
      } else {
        setError('Login failed. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated: authenticated,
    isLoading,
    error,
    user,
    wallet,
    login: handleLogin,
    logout: handleLogout,
    isReady: ready
  };
}