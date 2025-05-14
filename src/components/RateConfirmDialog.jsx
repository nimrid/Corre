import React, { useEffect, useState } from 'react';

export default function RateConfirmDialog({ amount, onClose, onConfirm }) {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setLoading(true);
    setErr(null);
    fetch(`https://api-staging.paj.cash/pub/rate/${amount}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch rate');
        return res.json();
      })
      .then(data => setRate(data))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [amount]);

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.4)',
      zIndex: 1100,
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
        <h3 style={{textAlign:'center',marginTop:0}}>Confirm Transfer</h3>
        <div style={{marginBottom:12}}>
          {loading ? 'Fetching rate...' : err ? <span style={{color:'red'}}>{err}</span> : (
            rate && (
              <>
                <div style={{marginBottom:6}}>
                  Amount you will receive: {rate?.rate?.targetCurrency}
                </div>
                <div style={{fontWeight:600,fontSize:'1.2em'}}>
                  {rate?.amounts?.userAmountFiat !== undefined ? Number(rate.amounts.userAmountFiat).toFixed(2) : ''}
                </div>
              </>
            )
          )}
        </div>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button type="button" className="action-btn" style={{minWidth:110}} onClick={onConfirm} disabled={loading || !!err}>
            Confirm
          </button>
          <button type="button" className="action-btn" style={{minWidth:90,background:'#eee',color:'#222'}} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
