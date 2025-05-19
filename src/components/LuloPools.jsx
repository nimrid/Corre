import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useUser } from '@civic/auth-web3/react';

// Constants
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL ||
    'https://mainnet.helius-rpc.com/?api-key=fa1fa628-f674-4fa6-8b63-6f9b85c18166',
  'confirmed'
);
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Cache constants
const CACHE_KEY = 'lulo_pools_data';
const CACHE_TIMESTAMP_KEY = 'lulo_pools_timestamp';
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

function LuloPools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [metrics, setMetrics] = useState({
    totalLiquidity: 0,
    availableLiquidity: 0,
    regularLiquidityAmount: 0,
    protectedLiquidityAmount: 0,
  });
  const [showErrorToast, setShowErrorToast] = useState(false);
  const navigate = useNavigate();
  const { wallet } = useWalletContext();
  const userContext = useUser();
  const civicWallet = userContext?.solana?.wallet;
  const [balances, setBalances] = useState({ USDC: '0.00' });

  // Function to fetch data from API
  const fetchPoolsData = async () => {
    try {
      const options = {
        method: 'GET',
        headers: {
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
          'Content-Type': 'application/json',
        },
      };
      const response = await fetch('https://api.lulo.fi/v1/pool.getPools', options);
      const data = await response.json();

      // Extract metrics from the response
      const metrics = {
        totalLiquidity: data.totalLiquidity || 0,
        availableLiquidity: data.availableLiquidity || 0,
        regularLiquidityAmount: data.regularLiquidityAmount || 0,
        protectedLiquidityAmount: data.protectedLiquidityAmount || 0
      };
      setMetrics(metrics);

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
        throw new Error('Unexpected response format');
      }

      // Store in local storage
      const cacheData = {
        pools: poolsList,
        metrics,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

      setPools(poolsList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pools data:', err);
      setError(err.message);
      setShowErrorToast(true);
      setLoading(false);
    }
  };

  // Function to load data from cache
  const loadFromCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const data = JSON.parse(cachedData);
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        
        if (now - timestamp < CACHE_DURATION) {
          // Cache is still valid
          setPools(data.pools);
          setMetrics(data.metrics);
          setLoading(false);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error loading from cache:', err);
      return false;
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (!loadFromCache()) {
        await fetchPoolsData();
      }
    };
    loadData();
  }, []);

  // Set up periodic refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      await fetchPoolsData();
    }, CACHE_DURATION);

    return () => clearInterval(refreshInterval);
  }, []);

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

  // Error toast close handler
  const handleCloseToast = () => setShowErrorToast(false);

  const handleDeposit = async (pool, amount) => {
    if (!civicWallet?.publicKey || !wallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert amount to proper format (handle decimals)
      const depositAmount = Math.floor(amount * 1e6); // Convert to USDC decimals (6)

      // Step 1: POST to Lulo API to generate the transaction
      const response = await fetch('https://api.lulo.fi/v1/generate.transactions.deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5'
        },
        body: JSON.stringify({
          owner: civicWallet.publicKey.toBase58(),
          feePayer: civicWallet.publicKey.toBase58(),
          mintAddress: USDC_MINT.toBase58(),
          regularAmount: pool.type === 'regular' ? depositAmount : 0,
          protectedAmount: pool.type === 'protected' ? depositAmount : 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Lulo API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error?.message || 'Failed to generate deposit transaction');
      }

      const { transaction } = await response.json();

      // Step 2: Deserialize the transaction
      console.log('Deserializing transaction...');
      const transactionBuffer = Buffer.from(transaction, 'base64');
      const deserializedTransaction = VersionedTransaction.deserialize(transactionBuffer);

      // Step 3: Get the user to sign the transaction first
      console.log('Getting user signature...');
      const userSignedTx = await wallet.signTransaction(deserializedTransaction);
      
      // Step 4: Send the user-signed transaction using the Civic wallet
      console.log('Getting Civic wallet signature and sending transaction...');
      const signature = await civicWallet.sendTransaction(userSignedTx, {
        skipPreflight: true,
        maxRetries: 3
      });

      // Step 5: Wait for confirmation
      console.log('Waiting for transaction confirmation...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Update UI or show success message
      console.log('Deposit successful:', signature);
      alert(`Successfully deposited ${amount} USDC into ${pool.type} pool.\nTx Signature: ${signature}`);
      setShowDepositModal(false);
      // Refresh pool data
      window.location.reload();
    } catch (err) {
      console.error('Lulo deposit error:', err);
      setError(err.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (pool, amount) => {
    if (!civicWallet?.publicKey || !wallet?.publicKey) {
      setError('Please connect your wallet first');
      setShowErrorToast(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert amount to proper format (handle decimals)
      const withdrawAmount = Math.floor(amount * 1e6); // Convert to USDC decimals (6)

      const endpoint = pool.type === 'protected' 
        ? 'https://api.lulo.fi/v1/generate.transactions.withdrawProtected'
        : 'https://api.lulo.fi/v1/generate.transactions.initiateRegularWithdraw';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5'
        },
        body: JSON.stringify({
          owner: civicWallet.publicKey.toBase58(),
          feePayer: civicWallet.publicKey.toBase58(),
          mintAddress: USDC_MINT.toBase58(),
          amount: withdrawAmount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Lulo API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error?.message || 'Failed to generate withdrawal transaction');
      }

      const { transaction } = await response.json();

      // Step 2: Deserialize the transaction
      console.log('Deserializing withdrawal transaction...');
      const transactionBuffer = Buffer.from(transaction, 'base64');
      const deserializedTransaction = VersionedTransaction.deserialize(transactionBuffer);

      // Step 3: Get the user to sign the transaction first
      console.log('Getting user signature...');
      const userSignedTx = await wallet.signTransaction(deserializedTransaction);
      
      // Step 4: Send the user-signed transaction using the Civic wallet
      console.log('Getting Civic wallet signature and sending transaction...');
      const signature = await civicWallet.sendTransaction(userSignedTx, {
        skipPreflight: true,
        maxRetries: 3
      });

      // Step 5: Wait for confirmation
      console.log('Waiting for transaction confirmation...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Update UI or show success message
      console.log('Withdrawal successful:', signature);
      alert(`Successfully initiated withdrawal of ${amount} USDC from ${pool.type} pool.\nTx Signature: ${signature}`);
      setShowWithdrawalModal(false);
      // Refresh pool data
      window.location.reload();
    } catch (err) {
      console.error('Lulo withdrawal error:', err);
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
          Lulo Pools
        </div>
      </div>

      {/* Lulo overview */}
      <div className="overview-descriptions" style={{ margin: '2em 0', padding: '1.5em', border: '2px solid #1a2cff', borderRadius: 12, background: '#f8faff' }}>
        <h2 style={{ color: '#1a2cff', marginBottom: '0.5em' }}>Lulo Pools Overview</h2>
        <p><strong>Regular Pool:</strong> Standard USDC deposits earning yield; no risk protection.</p>
        <p><strong>Protected Pool:</strong> Risk-protected deposits; losses covered by boosted pool funds in case of protocol failures.</p>
      </div>

      {/* Pool metrics */}
      <div className="overview-metrics" style={{ margin: '1em 0', padding: '1.5em', border: '2px solid #1a2cff', borderRadius: 12, background: '#f8faff' }}>
        <h3 style={{ color: '#1a2cff', marginBottom: '0.5em' }}>Pool Metrics</h3>
        <p>Total Liquidity: {formatUSDC(metrics.totalLiquidity)}</p>
        <p>Available Liquidity: {formatUSDC(metrics.availableLiquidity)}</p>
        <p>Regular Pool Liquidity: {formatUSDC(metrics.regularLiquidityAmount)}</p>
        <p>Protected Pool Liquidity: {formatUSDC(metrics.protectedLiquidityAmount)}</p>
      </div>

      {/* Pool cards */}
      {loading ? (
        <div style={{textAlign:'center',margin:'2em'}}>Loading pools...</div>
      ) : (
        <div className="pools-list">
          {pools.map((pool, index) => (
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
                if (key === 'maxWithdrawalAmount' || key === 'openCapacity') {
                  return (
                    <p key={key}>
                      <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: </span>
                      {formatUSDC(value)}
                    </p>
                  );
                }
                if (key === 'price') {
                  return (
                    <p key={key}>
                      <span className="label">Min Deposit Amount: </span>
                      {formatUSDC(value)}
                    </p>
                  );
                }
                return null;
              })}
              <div style={{ display: 'flex', gap: '1em', marginTop: '1em', justifyContent: 'center' }}>
                <button 
                  className="action-btn" 
                  onClick={() => { 
                    setSelectedPool(pool); 
                    setShowDepositModal(true); 
                  }}
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
                  onClick={() => { 
                    setSelectedPool(pool); 
                    setShowWithdrawalModal(true); 
                  }}
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
          ))}
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 style={{marginBottom:'1.5em'}}>
              Deposit into {selectedPool?.type} Pool
            </h3>
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
                onClick={() => handleDeposit(selectedPool, Number(depositAmount))}
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
            <h3 style={{marginBottom:'1.5em'}}>
              Withdraw from {selectedPool?.type} Pool
            </h3>
            <div style={{marginBottom:'1em',fontWeight:500}}>
              Available for Withdrawal: {formatUSDC(selectedPool?.maxWithdrawalAmount)}
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
                onClick={() => handleWithdraw(selectedPool, Number(withdrawalAmount))}
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

// --- Formatting helpers ---
function formatAPY(apy) {
  if (apy === undefined || apy === null) return '-';
  return (Number(apy) * 100).toFixed(2) + '%';
}

function formatUSDC(amount) {
  if (amount === undefined || amount === null) return '-';
  return Number(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' USDC';
}

export default LuloPools; 