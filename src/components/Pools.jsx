import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

function Pools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const navigate = useNavigate();
  const { wallet } = useWallet();

  useEffect(() => {
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
        // Normalize response to an array
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
          console.error('Unexpected response format', data);
          setError('Unexpected response format');
          setLoading(false);
          return;
        }
        setPools(poolsList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Handle deposit into pool
  const handleDeposit = async (pool, amountParam) => {
    if (!wallet?.address) {
      setError('Wallet not connected');
      return;
    }
    const amount = amountParam !== undefined
      ? amountParam
      : Number(window.prompt(`Enter amount to deposit into ${pool.type} pool`));
    if (!amount || isNaN(amount) || amount <= 0) return;
    setLoading(true);
    try {
      const options = {
        method: 'POST',
        headers: {
          'x-api-key': 'f0e24b78-5e9f-4670-a022-482e4536b3d5',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: wallet.address,
          feePayer: wallet.address,
          mintAddress: pool.mintAddress || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          regularAmount: pool.type === 'regular' ? amount : 0,
          protectedAmount: pool.type === 'protected' ? amount : 0,
        }),
      };
      const response = await fetch('https://api.lulo.fi/v1/generate.transactions.deposit', options);
      const data = await response.json();
      console.log('Deposit instructions:', data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pools-container">
      <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
      <h2>Pool Market Items</h2>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && !error && (
        <div className="pools-list">
          {pools.map((pool, index) => (
            <div className="pool-card" key={index}>
              <h3>{pool.type.charAt(0).toUpperCase() + pool.type.slice(1)} Pool</h3>
              {Object.entries(pool).map(([key, value]) =>
                key !== 'type' ? (
                  <p key={key}>
                    <span className="label">{key.replace(/([A-Z])/g, ' $1')}: </span>
                    {value}
                  </p>
                ) : null
              )}
              <button className="action-btn" onClick={() => { setSelectedPool(pool); setDepositAmount(''); setShowDepositModal(true); }}>Deposit</button>
            </div>
          ))}
        </div>
      )}
      {showDepositModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Deposit into {selectedPool?.type} Pool</h3>
            <input
              type="number"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button className="action-btn" onClick={() => { handleDeposit(selectedPool, Number(depositAmount)); setShowDepositModal(false); }}>Confirm</button>
            <button className="action-btn" onClick={() => setShowDepositModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pools;
