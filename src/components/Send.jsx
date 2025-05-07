import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import '../styles/send.css';

function Send() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  return (
    <div className="dashboard send-form">
      <header className="dashboard-header">
        <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <h2>Send Crypto</h2>
      </header>
      <div className="send-method-buttons vertical-buttons">
        <button className="action-btn send-method-btn" onClick={() => navigate('/send/wallet')}>
          <span role="img" aria-label="wallet" style={{marginRight: '0.6em'}}>👛</span>Send to Wallet Address
        </button>
        <button className="action-btn send-method-btn" onClick={() => setSelected('mobile')}>
          <span role="img" aria-label="mobile" style={{marginRight: '0.6em'}}>📱</span>Send to Mobile Money
        </button>
        <button className="action-btn send-method-btn" onClick={() => navigate('/send/bank')}>
          <span role="img" aria-label="bank" style={{marginRight: '0.6em'}}>🏦</span>Send to Bank Transfer
        </button>
      </div>
      <div className="send-method-content">
        {selected === 'wallet' && <div className="method-ui">Wallet Address send UI coming soon...</div>}
        {selected === 'mobile' && <div className="method-ui">Mobile Money send UI coming soon...</div>}
      </div>
    </div>
  );
}


export default Send;
