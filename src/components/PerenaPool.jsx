import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useUser } from '@civic/auth-web3/react';

// Constants for Perena integration
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL ||
    'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166',
  'confirmed'
);
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const PERENA_SEED_POOL = new PublicKey('BenJy1n3WTx9mTjEvy63e8Q1j4RqUc6E4VBMz3ir4Wo6');
const USD_STAR_MINT = PERENA_SEED_POOL; // USD* token mint is the same as the pool address

function PerenaPool() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [balances, setBalances] = useState({ USDC: '0.00', 'USD*': '0.00' });
  const navigate = useNavigate();
  const { wallet } = useWalletContext();
  const userContext = useUser();
  const civicWallet = userContext?.solana?.wallet;

  // Fetch balances for wallet
  useEffect(() => {
    async function fetchBalances() {
      if (!wallet?.publicKey) return;
      try {
        const ownerPubkey = wallet.publicKey;
        const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
        let usdcAmt = 0;
        let usdStarAmt = 0;
        resp.value.forEach(({ account }) => {
          const info = account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount?.uiAmount || 0;
          if (mint === USDC_MINT.toBase58()) usdcAmt = amount;
          if (mint === USD_STAR_MINT.toBase58()) usdStarAmt = amount;
        });
        setBalances({ 
          USDC: usdcAmt.toFixed(2),
          'USD*': usdStarAmt.toFixed(2)
        });
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to fetch token balances');
        setShowErrorToast(true);
      }
    }
    fetchBalances();
  }, [wallet?.publicKey]);

  // Error toast close handler
  const handleCloseToast = () => setShowErrorToast(false);

  const handleDeposit = async (amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }
    setLoading(true);
    try {
      const amountInLamports = Math.round(amount * 1e6).toString();

      const orderParams = new URLSearchParams({
        inputMint: USDC_MINT.toBase58(),
        outputMint: PERENA_SEED_POOL.toBase58(),
        amount: amountInLamports,
        slippageBps: '100',
        taker: civicWallet.publicKey.toBase58()
      });

      console.log('Requesting swap order with params:', orderParams.toString());

      const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${orderParams.toString()}`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json'
        }
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Jupiter API Error Response:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          body: errorText
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to generate order: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      console.log('Order response data:', orderData);

      if (!orderData.transaction || !orderData.requestId) {
        throw new Error('Invalid order response');
      }

      const { transaction: transactionBase64, requestId } = orderData;

      console.log('Deserializing transaction...');
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      console.log('Signing transaction...');
      console.log('Transaction required signers:', transaction.message.staticAccountKeys?.map(k => k.toBase58?.() || k.toString()));
      console.log('Civic wallet public key:', civicWallet.publicKey.toBase58());
      
      const signedTransaction = await civicWallet.signTransaction(transaction);

      console.log('Executing transaction...');
      const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

      const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          signedTransaction: serializedTransaction,
          requestId
        }, null, 2)
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        console.error('Execute API Error Response:', {
          status: executeResponse.status,
          statusText: executeResponse.statusText,
          body: errorText
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to execute transaction: ${executeResponse.status}`);
      }

      const executeData = await executeResponse.json();
      console.log('Execute response data:', executeData);

      if (executeData.status === 'Success') {
        console.log('Swap successful:', executeData);
        console.log(`Transaction Signature: ${executeData.signature}`);
        await connection.confirmTransaction(executeData.signature, 'confirmed');
        alert(`Successfully deposited ${amount} USDC into Perena Seed Pool.\nTx Signature: ${executeData.signature}`);
        setShowDepositModal(false);
      } else {
        throw new Error(executeData.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }

    if (parseFloat(balances['USD*']) < amount) {
      setError(`Insufficient USD* balance. You have ${balances['USD*']} USD*`);
      setShowErrorToast(true);
      return;
    }

    setLoading(true);
    try {
      const amountInLamports = Math.round(amount * 1e6).toString();

      const orderParams = new URLSearchParams({
        inputMint: USD_STAR_MINT.toBase58(),
        outputMint: USDC_MINT.toBase58(),
        amount: amountInLamports,
        slippageBps: '100',
        taker: civicWallet.publicKey.toBase58()
      });

      console.log('Requesting withdrawal swap order with params:', orderParams.toString());

      const orderResponse = await fetch(`https://lite-api.jup.ag/ultra/v1/order?${orderParams.toString()}`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json'
        }
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Jupiter API Error Response:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          body: errorText
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to generate order: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      console.log('Order response data:', orderData);

      if (!orderData.transaction || !orderData.requestId) {
        throw new Error('Invalid order response');
      }

      const { transaction: transactionBase64, requestId } = orderData;

      console.log('Deserializing transaction...');
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      console.log('Signing transaction...');
      console.log('Transaction required signers:', transaction.message.staticAccountKeys?.map(k => k.toBase58?.() || k.toString()));
      console.log('Civic wallet public key:', civicWallet.publicKey.toBase58());
      
      const signedTransaction = await civicWallet.signTransaction(transaction);

      console.log('Executing transaction...');
      const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

      const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          signedTransaction: serializedTransaction,
          requestId
        }, null, 2)
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        console.error('Execute API Error Response:', {
          status: executeResponse.status,
          statusText: executeResponse.statusText,
          body: errorText
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to execute transaction: ${executeResponse.status}`);
      }

      const executeData = await executeResponse.json();
      console.log('Execute response data:', executeData);

      if (executeData.status === 'Success') {
        console.log('Withdrawal successful:', executeData);
        console.log(`Transaction Signature: ${executeData.signature}`);
        await connection.confirmTransaction(executeData.signature, 'confirmed');
        alert(`Successfully withdrew ${amount} USD* from Perena Seed Pool.\nTx Signature: ${executeData.signature}`);
        setShowWithdrawalModal(false);
      } else {
        throw new Error(executeData.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pools-container">
      {showErrorToast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'#ffdddd',color:'#a00',padding:'1em 2em',borderRadius:8,zIndex:2000,boxShadow:'0 2px 12px #a002'}}>
          <span>{error}</span>
          <button style={{marginLeft:16,background:'none',border:'none',color:'#a00',fontWeight:700,cursor:'pointer'}} onClick={handleCloseToast}>Dismiss</button>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2rem 2rem 1.5rem 2rem'}}>
        <button className="action-btn" onClick={() => navigate('/pools')}>← Back to Pools</button>
        <div style={{flex:1}}></div>
        <div style={{fontWeight:800,fontSize:'2.1rem',letterSpacing:'-1px',color:'#16c784',fontFamily:'Montserrat,sans-serif',textShadow:'0 2px 12px #16c78422',textAlign:'right'}}>
          Perena Seed Pool
        </div>
      </div>

      {/* Perena Write-up */}
      <div className="perena-writeup" style={{ margin: '2em 0', padding: '1.5em', border: '2px solid #1a2cff', borderRadius: 12, background: '#f8faff' }}>
        <h2 style={{ color: '#1a2cff', marginBottom: '0.5em' }}>What is Perena and USD*</h2>
        <p><strong>Perena</strong> is a decentralized yield pool that allows you to earn passive income on your stablecoins. When you deposit USDC into the Perena Seed Pool, you receive a special yield-bearing token called <strong>USD*</strong> in return. This token represents your share in the pool and automatically accrues yield over time.</p>
        <ul style={{ margin: '1em 0 1em 1.5em' }}>
          <li><strong>Deposit USDC</strong> into the Perena Seed Pool.</li>
          <li><strong>Receive USD*</strong> tokens, which grow in value as the pool earns yield.</li>
          <li><strong>Redeem</strong> your USD* for USDC (plus earned yield) at any time.</li>
        </ul>
        <p><strong>Why use Perena?</strong><br />
          • Earn competitive, decentralized yield on your stablecoins.<br />
          • Withdraw anytime—no lockups.<br />
          • Transparent and on-chain.
        </p>
      </div>

      {/* Pool Card */}
      <div className="pool-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ color: '#1a2cff' }}>Perena Seed Pool</h3>
        <div style={{ margin: '1em 0', fontWeight: 500, fontSize: '1.1em', color: '#222' }}>
          Deposit USDC and get <span style={{color:'#16c784'}}>USD*</span> yield bearing token.
        </div>
        <div style={{ display: 'flex', gap: '1em', marginTop: '1em', justifyContent: 'center' }}>
          <button 
            className="action-btn" 
            onClick={() => setShowDepositModal(true)}
            style={{ 
              background: '#16c784',
              color: 'white',
              padding: '0.8em 2em',
              fontSize: '1.1em',
              fontWeight: 600
            }}
          >
            Deposit
          </button>
          <button 
            className="action-btn" 
            onClick={() => setShowWithdrawalModal(true)}
            style={{ 
              background: '#1a2cff',
              color: 'white',
              padding: '0.8em 2em',
              fontSize: '1.1em',
              fontWeight: 600
            }}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 style={{marginBottom:'1.5em'}}>Deposit into Perena Seed Pool</h3>
            <div style={{marginBottom:'1em',fontWeight:500}}>
              Your USDC Balance: {balances.USDC}
            </div>
            <input
              type="number"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '1.2em',
                fontSize: '1.2em',
                marginBottom: '1.5em',
                borderRadius: 8,
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <div style={{display:'flex',gap:16,justifyContent:'center'}}>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em'}} 
                onClick={() => handleDeposit(Number(depositAmount))}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em',background:'#eee',color:'#222'}} 
                onClick={() => setShowDepositModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 style={{marginBottom:'1.5em'}}>Withdraw from Perena Seed Pool</h3>
            <div style={{marginBottom:'1em',fontWeight:500}}>
              Your USD* Balance: {balances['USD*']}
            </div>
            <input
              type="number"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '1.2em',
                fontSize: '1.2em',
                marginBottom: '1.5em',
                borderRadius: 8,
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <div style={{display:'flex',gap:16,justifyContent:'center'}}>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em'}} 
                onClick={() => handleWithdraw(Number(withdrawalAmount))}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em',background:'#eee',color:'#222'}} 
                onClick={() => setShowWithdrawalModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerenaPool; 