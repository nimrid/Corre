import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router-dom';
import CivicLogoutButton from './CivicLogoutButton';
import QRCode from 'react-qr-code';
import { encodeURL } from '@solana/pay';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';
import { ConnectivityContext } from '../context/ConnectivityContext';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection } from '@solana/web3.js';

// Constants
const USDC_MINT = new SolanaPublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USD_STAR_MINT = new SolanaPublicKey('BenJy1n3WTx9mTjEvy63e8Q1j4RqUc6E4VBMz3ir4Wo6');
const CACHE_KEYS = {
  SAVINGS: 'lulo_savings_data',
  SAVINGS_TIMESTAMP: 'lulo_savings_timestamp',
  WALLET_ADDRESS: 'wallet_address'
};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

function Dashboard() {
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const { user, error: authError } = useAuth();
  const { wallet, balances, isLoading, error: walletError } = useWallet();
  const navigate = useNavigate();
  const [savingBalance, setSavingBalance] = useState(null);
  const [usdStarBalance, setUsdStarBalance] = useState(null);
  const [savingLoading, setSavingLoading] = useState(true);
  const [savingError, setSavingError] = useState(null);
  const { isOnline } = useContext(ConnectivityContext);

  const errorRaw = authError || walletError;
  const error = errorRaw === 'Failed to create wallet. Please try again.' ? null : errorRaw;

  const shortAddress = wallet?.address
    ? `${wallet.address.slice(0,4)}...${wallet.address.slice(-4)}`
    : '...';

  const receiveUrl = wallet?.address
    ? encodeURL({ recipient: new SolanaPublicKey(wallet.address) }).toString()
    : '';

  // Function to fetch USD* balance
  const fetchUsdStarBalance = async () => {
    if (!wallet?.address) return;
    try {
      const connection = new Connection(
        process.env.REACT_APP_SOLANA_RPC_URL ||
          'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166'
      );
      const ownerPubkey = new SolanaPublicKey(wallet.address);
      const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
      let usdStarAmt = 0;
      resp.value.forEach(({ account }) => {
        const info = account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount?.uiAmount || 0;
        if (mint === USD_STAR_MINT.toBase58()) usdStarAmt = amount;
      });
      setUsdStarBalance(usdStarAmt);
    } catch (err) {
      console.error('USD* balance fetch error:', err);
    }
  };

  // Function to fetch savings with caching
  const fetchSavings = async () => {
    if (!wallet?.address) return;
    
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEYS.SAVINGS);
    const cachedTimestamp = localStorage.getItem(CACHE_KEYS.SAVINGS_TIMESTAMP);
    const now = Date.now();
    
    if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_DURATION) {
      setSavingBalance(JSON.parse(cachedData));
      setSavingLoading(false);
      return;
    }

    setSavingLoading(true);
    setSavingError(null);
    
    try {
      const options = {
        method: 'GET',
        headers: {
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
          'Content-Type': 'application/json',
        },
      };
      
      const response = await fetch(`https://api.lulo.fi/v1/account.getAccount?owner=${wallet.address}`, options);
      const data = await response.json();
      
      // Cache the new data
      localStorage.setItem(CACHE_KEYS.SAVINGS, JSON.stringify(data.totalBalance ?? 0));
      localStorage.setItem(CACHE_KEYS.SAVINGS_TIMESTAMP, now.toString());
      
      setSavingBalance(data.totalBalance ?? 0);
    } catch (err) {
      console.error('Savings fetch error:', err);
      setSavingError(err.message);
    } finally {
      setSavingLoading(false);
    }
  };

  // Function to force refresh savings data
  const forceRefreshSavings = () => {
    localStorage.removeItem(CACHE_KEYS.SAVINGS);
    localStorage.removeItem(CACHE_KEYS.SAVINGS_TIMESTAMP);
    fetchSavings();
  };

  // Initial fetch and on wallet address change
  useEffect(() => {
    if (wallet?.address) {
      // Cache wallet address
      localStorage.setItem(CACHE_KEYS.WALLET_ADDRESS, wallet.address);
      fetchSavings();
      fetchUsdStarBalance();
    }
  }, [wallet?.address]);

  // Refresh on focus, visibility change, or when coming back online
  useEffect(() => {
    function handleRefresh() {
      fetchSavings();
      fetchUsdStarBalance();
    }
    
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleRefresh();
    });
    
    // Refresh when coming back online
    if (isOnline) handleRefresh();
    
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [wallet?.address, isOnline]);

  // Calculate total savings
  const totalSavings = (savingBalance || 0) + (usdStarBalance || 0);

  return (
    <>
      <style>
        {`
          .balance-card {
            position: relative;
          }
          
          .balance-card:hover .tooltip {
            display: block !important;
          }
          
          .tooltip {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            width: 200px;
            text-align: center;
            font-size: 0.8em;
            color: #666;
            margin-top: 8px;
            display: none;
          }
        `}
      </style>
      
      {showReceiveModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Receive Funds</h3>
            {wallet?.address && <QRCode value={receiveUrl} size={200} />}
            <p>{wallet?.address}</p>
            <button className="action-btn" onClick={() => setShowReceiveModal(false)}>Close</button>
          </div>
        </div>
      )}
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="logo">
            <h1>Corre</h1>
          </div>
          <CivicLogoutButton className="logout-btn">
            LOGOUT
          </CivicLogoutButton>
        </header>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <main className="dashboard-content">
          <section className="wallet-info">
            <h2>Your Solana Wallet</h2>
            <div className="wallet-details">
              <p>
                Address: {shortAddress}
                {wallet?.address && (
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(wallet.address)}
                    title="Copy address"
                  >📋</button>
                )}
              </p>
              <p>Network: Solana</p>
            </div>
          </section>

          <section className="balance-section">
            <h2>Balance</h2>
            <div className="balance-cards">
              <div className="balance-card">
                <h3>USDC (Native)</h3>
                <p className="balance">{balances?.USDC ?? '...'}</p>
                <div className="tooltip">
                  Always keep at least 0.003 SOL in your wallet for transaction fees
                </div>
              </div>
              <div className="balance-card">
                <h3>USDT</h3>
                <p className="balance">{balances?.USDT ?? '...'}</p>
              </div>
              <div className="balance-card">
                <h3>Total Savings</h3>
                <p className="balance">{savingLoading ? '...' : totalSavings.toFixed(2)} USDC</p>
                <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5em' }}>
                  <p>Lulo: {savingBalance?.toFixed(2) ?? '...'} USDC</p>
                  <p>USD*: {usdStarBalance?.toFixed(2) ?? '...'} USDC</p>
                </div>
              </div>
            </div>
            {savingError && <div className="error-message">Error: {savingError}</div>}
          </section>

          <section className="actions-section">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button className="action-btn" onClick={() => navigate('/manageclients')}>Manage Client</button>
              <button className="action-btn" onClick={() => navigate('/send')}>Send</button>
              <button className="action-btn" onClick={() => setShowReceiveModal(true)}>Receive</button>
              <button className="action-btn" onClick={() => window.location.href = '/pools'}>Save</button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default Dashboard;