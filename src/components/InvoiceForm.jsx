import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import QRCode from 'react-qr-code';
import Big from 'big.js';
import { encodeURL } from '@solana/pay';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';

function InvoiceForm() {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [stablecoin, setStablecoin] = useState('USDC');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0, total: 0 }]);
  const [additionalNote, setAdditionalNote] = useState('');

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const paymentUrl = wallet?.address
    ? encodeURL({
        recipient: new SolanaPublicKey(wallet.address),
        amount: new Big(totalAmount)
      }).toString()
    : '';

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

  return (
    <div className="dashboard invoice-form">
      <header className="dashboard-header">
        <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <h2>Create Invoice</h2>
      </header>
      <form className="form-container">
        <div className="balance-card form-section">
          <h3>Customer Info</h3>
          <input type="text" placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input type="email" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </div>
        <div className="balance-card form-section">
          <h3>Invoice Details</h3>
          <input
            type="text"
            placeholder="Title"
            value={invoiceTitle}
            onChange={(e) => setInvoiceTitle(e.target.value)}
          />
          <select
            value={stablecoin}
            onChange={(e) => setStablecoin(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="balance-card form-section">
          <h3>Items</h3>
          {items.map((item, index) => (
            <div className="item-row" key={index}>
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              />
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
              <input
                type="number"
                placeholder="Price"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
              />
              <span>Total: {item.total.toFixed(2)}</span>
              <button type="button" className="action-btn" onClick={() => handleRemoveItem(index)}>Remove</button>
            </div>
          ))}
          <button type="button" className="action-btn" onClick={handleAddItem}>Add Item</button>
        </div>
        <div className="balance-card form-section">
          <h3>Additional Note</h3>
          <textarea placeholder="Note" value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)} />
        </div>
        <div className="balance-card form-section">
          <h3>Payment Info</h3>
          {wallet?.address && <QRCode value={paymentUrl} size={150} />}
          <p>Wallet: {wallet?.address}</p>
          <p>Total Due: {totalAmount.toFixed(2)} {stablecoin}</p>
        </div>
        <div className="action-buttons invoice-actions">
          <button type="button" className="action-btn" onClick={handleSendInvoice}>Send Invoice</button>
          <button type="button" className="action-btn" onClick={handleSaveDraft}>Save as Draft</button>
        </div>
      </form>
    </div>
  );
}

export default InvoiceForm;
