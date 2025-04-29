import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

function SendWallet() {
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState(() => {
    // Load beneficiaries from localStorage if available
    const saved = localStorage.getItem('walletBeneficiaries');
    return saved ? JSON.parse(saved) : [];
  });
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleSaveBeneficiary = () => {
    if (walletAddress && !beneficiaries.includes(walletAddress)) {
      const updated = [...beneficiaries, walletAddress];
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
      if (!wallet || !wallet.address || !wallet.signTransaction) {
        setStatus('Wallet not connected or missing signing capability.');
        return;
      }
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const sender = new PublicKey(wallet.address);
      const recipient = new PublicKey(walletAddress);
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      // Get sender's associated token account
      const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, sender);
      // Get or create recipient's associated token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, sender, usdcMint, recipient);
      // Check sender's token balance
      const senderAccountInfo = await getAccount(connection, senderTokenAccount);
      const amountInSmallestUnit = Math.round(Number(amount) * 1e6); // USDC has 6 decimals
      if (senderAccountInfo.amount < BigInt(amountInSmallestUnit)) {
        setStatus('Insufficient USDC balance.');
        return;
      }
      // Create transfer instruction
      const ix = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount.address,
        sender,
        amountInSmallestUnit
      );
      const tx = new Transaction().add(ix);
      tx.feePayer = sender;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      // Sign and send
      const signedTx = await wallet.signTransaction(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txid, 'confirmed');
      setStatus(`Transaction sent! Tx ID: ${txid}`);
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
          <input
            type="text"
            className="wide-input"
            placeholder="Enter wallet address"
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
            required
          />
          <button type="button" className="action-btn" style={{marginTop: '0.5em'}} onClick={handleSaveBeneficiary}>Save as Beneficiary</button>
          {beneficiaries.length > 0 && (
            <div className="beneficiaries-list">
              <h4>Saved Beneficiaries</h4>
              <ul>
                {beneficiaries.map(addr => (
                  <li key={addr} onClick={() => setWalletAddress(addr)} style={{cursor: 'pointer'}}>{addr}</li>
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
    </div>
  );
}

export default SendWallet;
