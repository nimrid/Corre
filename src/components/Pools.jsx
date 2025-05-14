import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { useUser } from '@civic/auth-web3/react';

// Constants for Perena integration
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL ||
    'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166',
  'confirmed'
);
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const PERENA_SEED_POOL = new PublicKey('BenJy1n3WTx9mTjEvy63e8Q1j4RqUc6E4VBMz3ir4Wo6');

// Jupiter API endpoints
const JUPITER_ORDER_API = 'https://lite-api.jup.ag/ultra/v1/order';
const JUPITER_EXECUTE_API = 'https://lite-api.jup.ag/ultra/v1/execute';

// Function to get swap quote from Jupiter
async function getJupiterSwapQuote(inputMint, outputMint, amount) {
  try {
    const response = await fetch(
      `${JUPITER_ORDER_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get swap quote');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting Jupiter swap quote:', error);
    throw error;
  }
}

// Function to execute Jupiter swap
async function executeJupiterSwap(signedTransaction, requestId) {
  try {
    const response = await fetch(JUPITER_EXECUTE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        signedTransaction,
        requestId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to execute swap');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error executing Jupiter swap:', error);
    throw error;
  }
}

function Pools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [metrics, setMetrics] = useState({
    totalLiquidity: 0,
    availableLiquidity: 0,
    regularLiquidityAmount: 0,
    protectedLiquidityAmount: 0,
  });
  const [showErrorToast, setShowErrorToast] = useState(false);
  const navigate = useNavigate();
  const { wallet, walletAddress } = useWalletContext();
  const userContext = useUser();
  const civicWallet = userContext?.solana?.wallet;
  const [balances, setBalances] = useState({ USDC: '0.00' });

  // Fetch balances for wallet
  useEffect(() => {
    async function fetchBalances() {
      if (!wallet?.publicKey) return;
      try {
        const ownerPubkey = wallet.publicKey;
        const connection = new Connection(
          process.env.REACT_APP_SOLANA_RPC_URL ||
            'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166'
        );
        const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
        let usdcAmt = 0;
        resp.value.forEach(({ account }) => {
          const info = account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount?.uiAmount || 0;
          if (mint === USDC_MINT.toBase58()) usdcAmt = amount;
        });
        setBalances({ USDC: usdcAmt.toFixed(2) });
      } catch (err) {
        // Ignore balance errors for now
      }
    }
    fetchBalances();
  }, [wallet?.publicKey]);

  // Fetch pools/metrics
  useEffect(() => {
    setLoading(true);
    setError(null);
    const options = {
      method: 'GET',
      headers: {
        'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
        'Content-Type': 'application/json',
      },
    };
    fetch('https://api.lulo.fi/v1/pool.getPools', options)
      .then((response) => response.json())
      .then((data) => {
        if (data.totalLiquidity !== undefined) {
          const { totalLiquidity, availableLiquidity, regularLiquidityAmount, protectedLiquidityAmount } = data;
          setMetrics({ totalLiquidity, availableLiquidity, regularLiquidityAmount, protectedLiquidityAmount });
        }
        let poolsList = [];
        if (Array.isArray(data.pools)) {
          poolsList = data.pools;
        } else if (Array.isArray(data.data)) {
          poolsList = data.data;
        } else if (data.regular && data.protected) {
          poolsList = [data.regular, data.protected];
        } else if (Array.isArray(data)) {
          poolsList = data;
        } else {
          setError('Unexpected response format');
          setLoading(false);
          return;
        }
        setPools([
          ...poolsList,
          { type: 'perena', name: 'Perena Seed', address: PERENA_SEED_POOL.toBase58(), mintAddress: USDC_MINT.toBase58() }
        ]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setShowErrorToast(true);
        setLoading(false);
      });
  }, []);

  // Error toast close handler
  const handleCloseToast = () => setShowErrorToast(false);

  // --- Perena deposit/withdraw use civicWallet ---
  const handlePerenaDeposit = async (amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }
    setLoading(true);
    try {
      const amountInLamports = Math.round(amount * 1e6);
      const quote = await getJupiterSwapQuote(
        USDC_MINT.toBase58(),
        PERENA_SEED_POOL.toBase58(),
        amountInLamports
      );
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(quote.transaction, 'base64')
      );
      
      // Convert transaction to buffer before signing
      const messageBytes = transaction.message.serialize();
      const signedMessage = await civicWallet.signMessage(messageBytes);
      
      // Add the signature to the transaction
      transaction.addSignature(civicWallet.publicKey, signedMessage);
      
      const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');
      const result = await executeJupiterSwap(signedTransaction, quote.requestId);
      await connection.confirmTransaction(result.txid, 'confirmed');
      alert(`Successfully deposited ${amount} USDC into Perena Seed Pool. Tx ID: ${result.txid}`);
    } catch (err) {
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePerenaWithdraw = async (amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }
    setLoading(true);
    try {
      const amountInLamports = Math.round(amount * 1e6);
      const quote = await getJupiterSwapQuote(
        PERENA_SEED_POOL.toBase58(),
        USDC_MINT.toBase58(),
        amountInLamports
      );
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(quote.transaction, 'base64')
      );
      
      // Convert transaction to buffer before signing
      const messageBytes = transaction.message.serialize();
      const signedMessage = await civicWallet.signMessage(messageBytes);
      
      // Add the signature to the transaction
      transaction.addSignature(civicWallet.publicKey, signedMessage);
      
      const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');
      const result = await executeJupiterSwap(signedTransaction, quote.requestId);
      await connection.confirmTransaction(result.txid, 'confirmed');
      alert(`Successfully withdrew ${amount} USDC from Perena Seed Pool. Tx ID: ${result.txid}`);
    } catch (err) {
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle deposit into regular or protected pool
  const handleDeposit = async (pool, amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }
    
    setLoading(true);
    try {
      const options = {
        method: 'POST',
        headers: {
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: civicWallet.publicKey.toBase58(),
          feePayer: civicWallet.publicKey.toBase58(),
          mintAddress: pool.mintAddress || USDC_MINT.toBase58(),
          regularAmount: pool.type === 'regular' ? amount : 0,
          protectedAmount: pool.type === 'protected' ? amount : 0,
        }),
      };
      
      const response = await fetch('https://api.lulo.fi/v1/generate.transactions.deposit', options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate deposit transaction');
      }
      
      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(data.transaction, 'base64')
      );
      
      // Convert transaction to buffer before signing
      const messageBytes = transaction.message.serialize();
      const signedMessage = await civicWallet.signMessage(messageBytes);
      
      // Add the signature to the transaction
      transaction.addSignature(civicWallet.publicKey, signedMessage);
      
      // Send the transaction
      const txid = await connection.sendRawTransaction(transaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(txid, 'confirmed');
      
      alert(`Successfully deposited ${amount} USDC into ${pool.type} pool. Tx ID: ${txid}`);
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawal from regular or protected pool
  const handleWithdraw = async (pool, amount) => {
    if (!civicWallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = pool.type === 'protected' 
        ? 'https://api.lulo.fi/v1/generate.transactions.withdrawProtected'
        : 'https://api.lulo.fi/v1/generate.transactions.initiateRegularWithdraw';
      
      const options = {
        method: 'POST',
        headers: {
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: civicWallet.publicKey.toBase58(),
          feePayer: civicWallet.publicKey.toBase58(),
          mintAddress: pool.mintAddress || USDC_MINT.toBase58(),
          amount: amount
        }),
      };
      
      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate withdrawal transaction');
      }
      
      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(data.transaction, 'base64')
      );
      
      // Convert transaction to buffer before signing
      const messageBytes = transaction.message.serialize();
      const signedMessage = await civicWallet.signMessage(messageBytes);
      
      // Add the signature to the transaction
      transaction.addSignature(civicWallet.publicKey, signedMessage);
      
      // Send the transaction
      const txid = await connection.sendRawTransaction(transaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(txid, 'confirmed');
      
      alert(`Successfully initiated withdrawal of ${amount} USDC from ${pool.type} pool. Tx ID: ${txid}`);
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
      <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
      <h1 style={{ textAlign: 'center', margin: '1em 0' }}>Pools</h1>
      <h2>Pool Market Items</h2>
      {loading ? (
        <div style={{textAlign:'center',margin:'2em'}}>Loading pools...</div>
      ) : (
        <>
          {/* Perena Write-up and Seed Pool card at the very top */}
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
          {pools.filter(pool => pool.type === 'perena').map((pool, index) => (
            <div className="pool-card" key={index}>
              <h3 style={{ color: '#1a2cff' }}>Perena Seed Pool</h3>
              <div style={{ margin: '1em 0', fontWeight: 500, fontSize: '1.1em', color: '#222' }}>
                Deposit USDC and get <span style={{color:'#16c784'}}>USD*</span> yield bearing token.
              </div>
              <div style={{ display: 'flex', gap: '1em', marginTop: '1em' }}>
                <button 
                  className="action-btn" 
                  onClick={() => { 
                    setSelectedPool(pool); 
                    setShowDepositModal(true); 
                  }}
                >
                  Deposit
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => { 
                    setSelectedPool(pool); 
                    setShowWithdrawalModal(true); 
                  }}
                >
                  Withdraw
                </button>
              </div>
            </div>
          ))}

          {/* UseLulo overview below Perena */}
          <div className="overview-metrics" style={{ margin: '1em 0', padding: '1em', border: '1px solid #ccc', borderRadius: 8 }}>
            <p>Total Liquidity: {formatUSDC(metrics.totalLiquidity)}</p>
            <p>Available Liquidity: {formatUSDC(metrics.availableLiquidity)}</p>
            <p>Regular Pool Liquidity: {formatUSDC(metrics.regularLiquidityAmount)}</p>
            <p>Protected Pool Liquidity: {formatUSDC(metrics.protectedLiquidityAmount)}</p>
          </div>
          <div className="overview-descriptions" style={{ margin: '1em 0', padding: '1em', border: '1px solid #ccc', borderRadius: 8 }}>
            <p><strong>Regular Pool:</strong> Standard USDC deposits earning yield; no risk protection.</p>
            <p><strong>Protected Pool:</strong> Risk-protected deposits; losses covered by boosted pool funds in case of protocol failures.</p>
          </div>

          {/* Render regular and protected pools next */}
          <div className="pools-list">
            {pools.filter(pool => pool.type !== 'perena').map((pool, index) => (
              <div className="pool-card" key={index}>
                <h3>{pool.name ? `${pool.name} Pool` : `${pool.type.charAt(0).toUpperCase() + pool.type.slice(1)} Pool`}</h3>
                {Object.entries(pool).map(([key, value]) => {
                  if (key === 'apy') {
                    return (
                      <p key={key}>
                        <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: </span>
                        {formatAPY(value)}
                      </p>
                    );
                  }
                  if (key === 'maxWithdrawalAmount' || key === 'openCapacity' || key === 'price') {
                    return (
                      <p key={key}>
                        <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: </span>
                        {formatUSDC(value)}
                      </p>
                    );
                  }
                  return null;
                })}
                <div style={{ display: 'flex', gap: '1em', marginTop: '1em' }}>
                  <button 
                    className="action-btn" 
                    onClick={() => { 
                      setSelectedPool(pool); 
                      setShowDepositModal(true); 
                    }}
                  >
                    Deposit
                  </button>
                  <button 
                    className="action-btn" 
                    onClick={() => { 
                      setSelectedPool(pool); 
                      setShowWithdrawalModal(true); 
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {showDepositModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 style={{marginBottom:'1.5em'}}>
              {selectedPool?.type === 'perena' 
                ? 'Deposit into Perena Seed Pool'
                : `Deposit into ${selectedPool?.type} Pool`}
            </h3>
            {/* Show wallet balance in deposit dialog */}
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
                onClick={() => { 
                  if (selectedPool?.type === 'perena') {
                    handlePerenaDeposit(Number(depositAmount));
                  } else {
                    handleDeposit(selectedPool, Number(depositAmount));
                  }
                  setShowDepositModal(false); 
                }}
              >
                Confirm
              </button>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em',background:'#eee',color:'#222'}} 
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showWithdrawalModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 style={{marginBottom:'1.5em'}}>
              {selectedPool?.type === 'perena' 
                ? 'Withdraw from Perena Seed Pool'
                : `Withdraw from ${selectedPool?.type} Pool`}
            </h3>
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
                onClick={() => { 
                  if (selectedPool?.type === 'perena') {
                    handlePerenaWithdraw(Number(withdrawalAmount));
                  } else {
                    handleWithdraw(selectedPool, Number(withdrawalAmount));
                  }
                  setShowWithdrawalModal(false); 
                }}
              >
                Confirm
              </button>
              <button 
                className="action-btn" 
                style={{fontSize:'1.1em',padding:'0.8em 2em',background:'#eee',color:'#222'}} 
                onClick={() => setShowWithdrawalModal(false)}
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

// --- Formatting helpers ---
function formatAPY(apy) {
  if (apy === undefined || apy === null) return '-';
  return (Number(apy) * 100).toFixed(2) + '%';
}

function formatUSDC(amount) {
  if (amount === undefined || amount === null) return '-';
  return Number(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDC';
}

export default Pools;
