import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router-dom';
import CivicLogoutButton from './CivicLogoutButton';
import QRCode from 'react-qr-code';
import { encodeURL } from '@solana/pay';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';
import { ConnectivityContext } from '../context/ConnectivityContext';

function Dashboard() {
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const { user, error: authError } = useAuth();
  const { wallet, balances, isLoading, error: walletError } = useWallet();
  const navigate = useNavigate();
  const [savingBalance, setSavingBalance] = useState(null);
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

  // Function to fetch savings
  const fetchSavings = () => {
    if (!wallet?.address) return;
    setSavingLoading(true);
    setSavingError(null);
    const options = {
      method: 'GET',
      headers: {
        'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
        'Content-Type': 'application/json',
      },
    };
    fetch(`https://api.lulo.fi/v1/account.getAccount?owner=${wallet.address}`, options)
      .then((response) => response.json())
      .then((data) => {
        setSavingBalance(data.totalBalance ?? 0);
        setSavingLoading(false);
      })
      .catch((err) => {
        console.error('Savings fetch error:', err);
        setSavingError(err.message);
        setSavingLoading(false);
      });
  };

  // Initial fetch and on wallet address change
  useEffect(() => {
    fetchSavings();
  }, [wallet?.address]);

  // Refresh on focus, visibility change, or when coming back online
  useEffect(() => {
    function handleRefresh() {
      fetchSavings();
      // Optionally, trigger any wallet context refresh if available
      // (useWallet currently auto-fetches balances on address change and polls every 15s)
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

  return (
    <>
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
            <h2>Balances</h2>
            <div className="balance-cards">
              <div className="balance-card">
                <h3>USDC (Native)</h3>
                <p className="balance">{balances?.USDC ?? '...'}</p>
              </div>
              <div className="balance-card">
                <h3>USDT</h3>
                <p className="balance">{balances?.USDT ?? '...'}</p>
              </div>
              {/* Lulo savings balance */}
              <div className="balance-card">
                <h3>Savings</h3>
                <p className="balance">{savingLoading ? '...' : savingBalance}</p>
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