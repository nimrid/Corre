import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext.jsx';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

function SendWallet() {
  const { wallet, walletAddress } = useWalletContext();
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState(() => {
    // Load beneficiaries from localStorage if available
    const saved = localStorage.getItem('walletBeneficiaries');
    return saved ? JSON.parse(saved) : [];
  });
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleSaveBeneficiary = () => {
    if (recipientAddress && !beneficiaries.includes(recipientAddress)) {
      const updated = [...beneficiaries, recipientAddress];
      setBeneficiaries(updated);
      localStorage.setItem('walletBeneficiaries', JSON.stringify(updated));
      setStatus('Beneficiary saved!');
      setTimeout(() => setStatus(''), 1200);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setStatus('Processing...');
    try {
      // Use Civic's useUser for solana.wallet
      if (!wallet) {
        setStatus('Wallet not connected or cannot send transactions.');
        return;
      }
      const connection = new Connection(
        'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166',
        'confirmed'
      );
      const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const fromATA = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      const toATA = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(recipientAddress));
      const amountInSmallestUnit = Math.round(Number(amount) * 1e6);
      const ix = createTransferInstruction(fromATA, toATA, wallet.publicKey, amountInSmallestUnit);
      const tx = new Transaction().add(ix);
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setStatus(`Transaction sent! Tx ID: ${signature}`);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('Failed to send: ' + (err.message || err.toString()));
    }
  };

  return (
    <div className="dashboard send-wallet-form">
      <header className="dashboard-header">
        <button className="action-btn" onClick={() => navigate('/send')}>← Back</button>
        <h2>Send to Wallet Address</h2>
      </header>
      <form className="form-container" onSubmit={handleSend}>
        <div className="balance-card form-section">
          <h3>Recipient Wallet Address</h3>
          <div
            style={{
              display: 'flex',
              gap: '1.2em',
              alignItems: 'center',
              marginBottom: '2em',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Enter wallet address"
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                padding: '1.2em',
                fontSize: '1.1em',
                borderRadius: 8,
                border: '1.5px solid #ccc',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: 0,
              }}
            />
            <button
              className="action-btn"
              style={{
                fontSize: '1.1em',
                padding: '1.2em 2.2em',
                marginLeft: 0,
                marginTop: 0,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onClick={handleSaveBeneficiary}
            >
              Save as Beneficiary
            </button>
          </div>
          {beneficiaries.length > 0 && (
            <div className="beneficiaries-list">
              <h4>Saved Beneficiaries</h4>
              <ul>
                {beneficiaries.map(addr => (
                  <li key={addr} onClick={() => setRecipientAddress(addr)} style={{cursor: 'pointer'}}>{addr}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="balance-card form-section">
          <h3>Amount</h3>
          <input
            type="number"
            className="wide-input"
            style={{ padding: '1rem', fontSize: '1rem', marginBottom: '1rem' }}
            min="0"
            step="0.01"
            placeholder="Amount (USDC)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="action-buttons" style={{marginTop: '2rem'}}>
          <button className="action-btn" type="submit">Process Payment</button>
        </div>
        {status && <div className="success-message">{status}</div>}
      </form>
      {walletAddress && (
        <div style={{ marginTop: '1rem', fontSize: '0.96em', wordBreak: 'break-all' }}>
          <strong>Your Solana Wallet Address:</strong>
          <pre style={{ background: '#f4f4f4', padding: '0.5em', borderRadius: '4px', marginTop: '0.2em' }}>{walletAddress}</pre>
        </div>
      )}
      <style>{`
        @media (max-width: 600px) {
          .send-wallet-flex-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SendWallet;
