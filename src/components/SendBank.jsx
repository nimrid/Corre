import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import '../styles/send.css';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import RateConfirmDialog from './RateConfirmDialog';
import { useUser } from '@civic/auth-web3/react';
import nacl from 'tweetnacl'; // For optional signature verification

const BASE_URL = 'https://api-staging.paj.cash';

// Solana setup
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL ||
    'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166'
);
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// TTL (1 hour) storage helpers
const TTL_MS = 3600000;
function setWithExpiry(key, value) {
  const item = { value, expiry: Date.now() + TTL_MS };
  localStorage.setItem(key, JSON.stringify(item));
}
function getWithExpiry(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

// Optional: Helper to verify signature (for debugging, not required in production)
function verifySignature(payload, signatureBase58, publicKeyBase58) {
  const messageBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = bs58.decode(signatureBase58);
  const publicKeyBytes = (new PublicKey(publicKeyBase58)).toBytes();
  return nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);
}

function SendBank() {
  const navigate = useNavigate();
  const { wallet, balances, isLoading: walletLoading, error: walletError } = useWallet();
  const { email } = useAuth();
  const userContext = useUser();
  const civicWallet = userContext?.solana?.wallet;
  const [amount, setAmount] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [banksList, setBanksList] = useState([]);
  const [newBankId, setNewBankId] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resolvedName, setResolvedName] = useState('');
  const [resolveError, setResolveError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false); // Added showRateDialog state

  // Fetch user bank accounts from PAJ API
  const fetchUserBankAccounts = async () => {
    try {
      if (!email) return;
      const initRes = await fetch(`${BASE_URL}/pub/initiate`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email}) });
      if (!initRes.ok) throw new Error('Session initiation failed');
      const verifyRes = await fetch(`${BASE_URL}/pub/verify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, otp: '1234' }) });
      if (!verifyRes.ok) throw new Error('Session verification failed');
      const { token: sessionToken } = await verifyRes.json();
      setWithExpiry('session_token', sessionToken);
      const res = await fetch(`${BASE_URL}/pub/bankaccount`, { headers: {'Content-Type':'application/json', Authorization:`Bearer ${sessionToken}`} });
      if (!res.ok) throw new Error('Failed to fetch bank accounts');
      const data = await res.json();
      const list = data.accounts || data.data || data.bankAccounts || data;
      setBankAccounts(list);
      setWithExpiry('bankAccounts', list);
    } catch (err) {
      console.error('Fetch bank accounts error:', err);
    }
  };

  // Auto-fetch bank accounts on user change
  useEffect(() => { if (email) fetchUserBankAccounts(); }, [email]);

  // Load banks list from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem('banksList');
    if (stored) setBanksList(JSON.parse(stored));
  }, []);

  // Fetch list of banks and cache in localStorage
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch(`${BASE_URL}/pub/bank`);
        if (!res.ok) throw new Error('Failed to fetch banks list');
        const data = await res.json();
        console.log('Fetched banks data:', data);
        let list = [];
        if (data.data && Array.isArray(data.data.banks)) {
          list = data.data.banks;
        } else if (Array.isArray(data.banks)) {
          list = data.banks;
        } else if (Array.isArray(data.data)) {
          list = data.data;
        } else if (Array.isArray(data)) {
          list = data;
        }
        setBanksList(list);
        localStorage.setItem('banksList', JSON.stringify(list));
      } catch (err) {
        console.error('Error fetching banks:', err);
      }
    };
    fetchBanks();
  }, []);

  // Resolve account name when 10-digit number entered
  useEffect(() => {
    if (newAccountNumber.length !== 10 || !newBankId) {
      setResolvedName('');
      setResolveError(null);
      return;
    }
    const resolveAccount = async () => {
      setIsResolving(true);
      setResolveError(null);
      try {
        const res = await fetch(
          `${BASE_URL}/pub/bankaccount/resolve?bankId=${newBankId}&accountNumber=${newAccountNumber}`
        );
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setResolvedName(data.accountName || data.name);
      } catch (err) {
        console.error('Resolve error:', err);
        setResolveError(err.message);
      } finally {
        setIsResolving(false);
      }
    };
    resolveAccount();
  }, [newAccountNumber, newBankId]);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    
    if (amt > parseFloat(balances.USDC)) {
      setError('Amount exceeds your USDC balance');
      return;
    }
    
   if (!selectedAccount) {
      setError('Select a bank account');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the Civic embedded wallet's publicKey (not address)
      const publicKey = civicWallet?.publicKey?.toBase58?.() || '';
      const timestamp = new Date().toISOString();
      const payload = { publicKey, accountId: selectedAccount, timestamp };
      let pajWallet = localStorage.getItem('pajWallet');
      // Get session token for Authorization header
      const sessionToken = getWithExpiry('session_token');

      if (!pajWallet) {
        // First check if wallet already exists in PAJ
        const checkWalletRes = await fetch(`${BASE_URL}/pub/wallet/${publicKey}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
          }
        });

        if (checkWalletRes.ok) {
          // Wallet exists, use the response
          pajWallet = await checkWalletRes.json();
          localStorage.setItem('pajWallet', JSON.stringify(pajWallet));
        } else if (checkWalletRes.status === 404) {
          // Wallet doesn't exist, proceed with adding it
          if (!civicWallet || typeof civicWallet.signMessage !== 'function') {
            throw new Error('Civic wallet does not support message signing. Please use a compatible wallet.');
          }
          const message = JSON.stringify(payload);
          const signedMessage = await civicWallet.signMessage(Buffer.from(message, 'utf-8'));
          const signature = bs58.encode(signedMessage);
          
          // Add wallet to PAJ
          const linkRes = await fetch(`${BASE_URL}/pub/wallet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
            },
            body: JSON.stringify({ payload, signature }),
          });
          if (!linkRes.ok) throw new Error('Wallet link failed');
          pajWallet = await linkRes.json();
          localStorage.setItem('pajWallet', JSON.stringify(pajWallet));
        } else {
          throw new Error('Failed to check wallet status');
        }
      }

      // --- USDC Transfer Logic ---
      // 1. Get tx pool address
      const poolRes = await fetch(`${BASE_URL}/pub/txpool-address`);
      if (!poolRes.ok) throw new Error('Failed to fetch tx pool address');
      const { address: poolAddress } = await poolRes.json();
      console.log('TX Pool Address:', poolAddress);
      // 2. Perform USDC transfer on Solana
      const userPub = new PublicKey(wallet.address);
      const poolPub = new PublicKey(poolAddress);
      // Associated token accounts
      const sourceATA = await getAssociatedTokenAddress(USDC_MINT, userPub);
      const destATA = await getAssociatedTokenAddress(USDC_MINT, poolPub);
      const amountUnits = Math.round(amt * 1e6); // USDC has 6 decimals
      const ix = createTransferInstruction(sourceATA, destATA, userPub, amountUnits, [], TOKEN_PROGRAM_ID);
      const tx = new Transaction().add(ix);
      tx.feePayer = userPub;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      const signed = await (
        civicWallet && typeof civicWallet.signTransaction === 'function'
          ? civicWallet.signTransaction(tx)
          : (() => { throw new Error('Civic wallet does not support transaction signing. Please use a compatible wallet.'); })()
      );
      const txid = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(txid, 'confirmed');

      navigate('/dashboard', { state: { message: `USDC sent: ${amt}, tx: ${txid}` } });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new bank account
  const handleAddAccount = async () => {
    setAddError(null);
    // Using Civic Auth email from hook
    if (!email) {
      setAddError('Cannot find user email');
      setIsAdding(false);
      return;
    }
    if (!newBankId || !newAccountNumber) {
      setAddError('Select bank and enter account number');
      return;
    }
    setIsAdding(true);
    try {
      // Initiate PAJ session
      await fetch(`${BASE_URL}/pub/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Verify session with OTP
      const verifyRes = await fetch(`${BASE_URL}/pub/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: '1234' }),
      });
      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        throw new Error(errData.message || 'Verification failed');
      }
      const { token: sessionToken } = await verifyRes.json();
      setWithExpiry('session_token', sessionToken);
      // Add bank account using session token
      const res = await fetch(`${BASE_URL}/pub/bankAccount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          bankId: newBankId,
          accountNumber: newAccountNumber,
          email // always include user email for traceability
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Add account failed');
      }
      const acct = await res.json();
      setBankAccounts(prev => {
        const updated = [...prev, acct];
        setWithExpiry('bankAccounts', updated);
        return updated;
      });
      setNewBankId('');
      setNewAccountNumber('');
      setShowAddDialog(false);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };
th
  return (
    <div className="dashboard send-form">
      <header className="dashboard-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2rem 2rem 1.5rem 2rem'}}>
        <button className="action-btn" style={{margin:0}} onClick={() => navigate('/send')}>← Back</button>
        <div style={{flex:1}}></div>
        <div style={{display:'flex',alignItems:'center',gap:'1.2rem'}}>
          <span style={{fontWeight:800,fontSize:'2.1rem',letterSpacing:'-1px',color:'#16c784',fontFamily:'Montserrat,sans-serif',textShadow:'0 2px 12px #16c78422'}}>Corre</span>
          <span style={{fontWeight:700,fontSize:'1.35rem',color:'#111'}}> - Send to Bank Transfer</span>
        </div>
      </header>
      <div className="send-form-body">
        <div className="balance-info">
          Balance: {walletLoading ? 'Loading...' : `${balances.USDC} USDC`}
          {walletError && <div className="error">{walletError}</div>}
        </div>
        {/* ADDED BANK ACCOUNTS LIST */}
        {bankAccounts.length > 0 && (
          <div style={{margin:'16px 0 24px 0',padding:'12px',background:'#f8f8f8',borderRadius:8}}>
            <div style={{fontWeight:600,marginBottom:8}}>Added Bank Accounts:</div>
            <ul style={{margin:0,paddingLeft:18}}>
              {bankAccounts.map(acct => (
                <li key={acct.id} style={{marginBottom:4}}>
                  {acct.accountName} - {acct.accountNumber} - {acct.bank}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="account-select-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
          
          <div style={{ textAlign: 'right' }}>
            <button type="button" className="action-btn" onClick={() => setShowAddDialog(true)}>
              Add Account
            </button>

          </div>
        </div>
        {/* Select Bank Account Dropdown */}
        <form onSubmit={e => { e.preventDefault(); setShowRateDialog(true); }} className="send-bank-form" style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '2.5rem 2rem',
          maxWidth: 420,
          margin: '2rem auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}>
          <label style={{fontWeight: 500, marginBottom: 8, fontSize: 18}}>
            Select Bank Account
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8em',
                borderRadius: 8,
                border: '1px solid #bdbdbd',
                marginTop: 8,
                fontSize: 16,
                background: '#f9f9f9',
              }}
              required
            >
              <option value="">-- Choose an account --</option>
              {bankAccounts.map(acct => (
                <option key={acct.id} value={acct.id}>
                  {acct.accountName} - {acct.accountNumber} - {acct.bank}
                </option>
              ))}
            </select>
          </label>
          <label style={{fontWeight: 500, marginBottom: 8, fontSize: 18}}>
            Amount (USDC)
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '1.5em 1em',
                borderRadius: 12,
                border: '1.5px solid #bdbdbd',
                fontSize: 28,
                fontWeight: 600,
                marginTop: 8,
                background: '#f5f7fa',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border .2s',
              }}
              required
            />
          </label>
          {error && <div className="error" style={{marginBottom: 8}}>{error}</div>}
          <button type="submit" className="action-btn" style={{
            fontSize: 20,
            padding: '1em',
            borderRadius: 10,
            fontWeight: 600,
            background: '#16c784',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 8px rgba(22,199,132,0.10)',
            marginTop: 12,
            cursor: 'pointer',
            transition: 'background .2s',
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>

        {/* Rate confirmation dialog for Send */}
        {showRateDialog && (
          <RateConfirmDialog
            amount={amount}
            onClose={() => setShowRateDialog(false)}
            onConfirm={async () => {
              setShowRateDialog(false);
              await handleSubmit();
            }}
          />
        )}

        {showAddDialog && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div className="modal" style={{
              background: '#fff',
              padding: '2rem 1.5rem',
              borderRadius: '16px',
              minWidth: 320,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2em',
              alignItems: 'stretch',
              position: 'relative',
              height: 'auto',
              maxHeight: 'fit-content',
            }}>
              <h3 style={{textAlign:'center',marginTop:0}}>Add Bank Account</h3>
              <label style={{display:'flex',flexDirection:'column',gap:4}}>
                Bank Name
                <select value={newBankId} onChange={e => setNewBankId(e.target.value)} disabled={!banksList.length} style={{padding:8}}>
                  <option value="">{banksList.length ? '--Select Bank--' : 'Loading banks...'}</option>
                  {banksList.map(b => (
                    <option key={b.id} value={b.id}>{b.name || b.bankName}</option>
                  ))}
                </select>
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:4}}>
                Account Number
                <input type="text" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} style={{padding:8}} />
              </label>
              {newAccountNumber.length === 10 && (
                isResolving ? <div>Verifying account...</div>
                  : resolvedName ? <div>Account Name: {resolvedName}</div>
                  : resolveError ? <div className="error">{resolveError}</div>
                  : null
              )}
              {addError && <div className="error" style={{marginBottom:8}}>{addError}</div>}
              <div style={{display:'flex',gap:12,justifyContent:'center'}}>
                <button type="button" className="action-btn" style={{minWidth:110}} onClick={handleAddAccount} disabled={isAdding}>
                  {isAdding ? 'Saving...' : 'Save Account'}
                </button>
                <button type="button" className="action-btn" style={{minWidth:90,background:'#eee',color:'#222'}} onClick={() => setShowAddDialog(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SendBank;
