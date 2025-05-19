import React from 'react';
import { useNavigate } from 'react-router-dom';

function Pools() {
  const navigate = useNavigate();

  return (
    <div className="pools-container">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2rem 2rem 1.5rem 2rem'}}>
      <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <div style={{flex:1}}></div>
        <div style={{fontWeight:800,fontSize:'2.1rem',letterSpacing:'-1px',color:'#16c784',fontFamily:'Montserrat,sans-serif',textShadow:'0 2px 12px #16c78422',textAlign:'right'}}>
          Corre - Pools
        </div>
      </div>
      <h2>Pool Market Items</h2>

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
        <div style={{ marginTop: '1.5em', textAlign: 'center' }}>
          <button 
            className="action-btn" 
            onClick={() => navigate('/perena')}
              style={{
              background: '#1a2cff',
              color: 'white',
              padding: '0.8em 2em',
              fontSize: '1.1em',
              fontWeight: 600
            }}
          >
            Go to Perena Seed Pool
          </button>
        </div>
      </div>

      {/* Lulo overview */}
      <div className="overview-descriptions" style={{ margin: '2em 0', padding: '1.5em', border: '2px solid #1a2cff', borderRadius: 12, background: '#f8faff' }}>
        <h2 style={{ color: '#1a2cff', marginBottom: '0.5em' }}>Lulo Pools Overview</h2>
        <p><strong>Regular Pool:</strong> Standard USDC deposits earning yield; no risk protection.</p>
        <p><strong>Protected Pool:</strong> Risk-protected deposits; losses covered by boosted pool funds in case of protocol failures.</p>
        <div style={{ marginTop: '1.5em', textAlign: 'center' }}>
          <button 
            className="action-btn" 
            onClick={() => navigate('/lulo')}
              style={{
              background: '#16c784',
              color: 'white',
              padding: '0.8em 2em',
              fontSize: '1.1em',
              fontWeight: 600
            }}
          >
            Go to Lulo Pools
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pools;
