import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import QRCode from 'react-qr-code';
import Big from 'big.js';
import { encodeURL } from '@solana/pay';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';
import '../styles/invoiceform.css';

function InvoiceForm() {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  // Error boundary state
  const [componentError, setComponentError] = useState(null);

  // Debug logging 
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('InvoiceForm: wallet', wallet);
    // eslint-disable-next-line no-console
    // paymentUrl will be defined below
  }
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [stablecoin, setStablecoin] = useState('USDC');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0, total: 0 }]);
  const [additionalNote, setAdditionalNote] = useState('');

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  // Only generate paymentUrl if wallet.address exists and totalAmount is a valid positive number
  let paymentUrl = '';
  if (wallet?.address && totalAmount > 0) {
    paymentUrl = encodeURL({
      recipient: new SolanaPublicKey(wallet.address),
      amount: new Big(totalAmount.toString())
    }).toString();
  }

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'description' ? value : Number(value);
    updated[index].total = updated[index].quantity * updated[index].price;
    setItems(updated);
  };

  const handleSaveDraft = () => {
    console.log('Draft saved', { customerName, customerEmail, invoiceTitle, stablecoin, dueDate, items, additionalNote });
    navigate('/dashboard');
  };

  const handleSendInvoice = () => {
    console.log('Invoice sent', { customerName, customerEmail, invoiceTitle, stablecoin, dueDate, items, additionalNote });
    navigate('/dashboard');
  };

  if (componentError) {
    return (
      <div className="dashboard invoice-form">
        <header className="dashboard-header">
          <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
          <h2>Error in Invoice Form</h2>
        </header>
        <div className="error-message">
          <p>{componentError.toString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard invoice-form">
      <header className="dashboard-header">
        <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <h2>Create Invoice</h2>
      </header>
      <form className="form-container">
        <div className="balance-card form-section">
          <h3>Customer Info</h3>
          <input type="text" className="wide-input" placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input type="email" className="wide-input" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </div>
        <div className="balance-card form-section">
          <h3>Invoice Details</h3>
          <input
            type="text"
            className="wide-input"
            placeholder="Title"
            value={invoiceTitle}
            onChange={(e) => setInvoiceTitle(e.target.value)}
          />
          <div className="due-date-group">
            <label htmlFor="due-date" className="due-date-label">Due Date</label>
            <input
              id="due-date"
              type="date"
              className="wide-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {/*
          <select
            value={stablecoin}
            onChange={(e) => setStablecoin(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
          */}
        </div>
        <div className="balance-card form-section">
          <h3>Items</h3>
          <div className="item-header-row">
            <span className="item-desc-label">Description</span>
            <span className="item-qty-label">Quantity</span>
            <span className="item-price-label">Amount</span>
            <span style={{flex: '0 0 30px'}}></span>
          </div>
          {items.map((item, index) => (
            <div className="item-row responsive-item-row" key={index}>
              <input
                type="text"
                className="wide-input item-desc"
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              />
              <input
                type="number"
                className="wide-input item-qty"
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
              <input
                type="number"
                className="wide-input item-price"
                placeholder="Price"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
              />
              <span className="item-total">{item.total.toFixed(2)}</span>
              <button type="button" className="action-btn remove-btn small-remove-btn" title="Remove Item" onClick={() => handleRemoveItem(index)}>🗑️</button>
            </div>
          ))}
          <button type="button" className="action-btn small-add-btn" onClick={handleAddItem}>Add Item</button>
        </div>
        <div className="balance-card form-section">
          <h3>Additional Note</h3>
          <textarea className="wide-input" placeholder="Note" value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)} />
        </div>
        <div className="balance-card form-section">
          <h3>Payment Info</h3>
          <div className="usdc-warning">Only send <b>USDC</b> on the <b>Solana</b> network to this address.</div>
          {wallet?.address && <QRCode value={paymentUrl} size={150} />}
          <p className="wallet-address-mobile">Wallet: <span>{wallet?.address}</span></p>
          <p>Total Due: {totalAmount.toFixed(2)} USDC</p>
        </div>
        <div className="action-buttons invoice-actions" style={{ marginTop: '2rem' }}>
          <button type="button" className="action-btn" onClick={handleSendInvoice}>Send Invoice</button>
          <button type="button" className="action-btn" onClick={handleSaveDraft}>Save as Draft</button>
        </div>
      </form>
    </div>
  );
}

export default InvoiceForm;
