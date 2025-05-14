import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import QRCode from 'react-qr-code';
import { jsPDF } from 'jspdf';
import { useAuth } from '../hooks/useAuth';
import emailjs from 'emailjs-com';

function ManageClients() {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const { user } = useAuth();

  const [clients, setClients] = useState(() => {
    const stored = localStorage.getItem('clients');
    return stored ? JSON.parse(stored) : [];
  });
  const [selectedClient, setSelectedClient] = useState(null);

  const [invoices, setInvoices] = useState(() => {
    const stored = localStorage.getItem('invoices');
    return stored ? JSON.parse(stored) : [];
  });

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', email: '', notes: '', id: null });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ id: null, clientId: '', items: [{ desc: '', qty: 1, price: 0 }], due: '', notes: '', status: 'pending' });

  useEffect(() => { localStorage.setItem('clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('invoices', JSON.stringify(invoices)); }, [invoices]);

  const openClientModal = (client = null) => {
    setClientForm(client ? { name: client.name, email: client.email, notes: client.notes, id: client.id } : { name: '', email: '', notes: '', id: null });
    setShowClientModal(true);
  };
  const saveClient = () => {
    if (!clientForm.name || !clientForm.email) return;
    if (clientForm.id) {
      setClients(clients.map(c => c.id === clientForm.id ? clientForm : c));
    } else {
      setClients([...clients, { ...clientForm, id: Date.now() }]);
    }
    setShowClientModal(false);
  };
  const deleteClient = (id) => {
    setClients(clients.filter(c => c.id !== id));
    setInvoices(invoices.filter(inv => inv.clientId !== id));
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  const openInvoiceModal = (client, invoice = null) => {
    setSelectedClient(client);
    setInvoiceForm(invoice ? invoice : { id: null, clientId: client.id, items: [{ desc: '', qty: 1, price: 0 }], due: '', notes: '', status: 'pending' });
    setShowInvoiceModal(true);
  };
  const saveInvoice = () => {
    const total = invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const newInv = { ...invoiceForm, total };
    if (newInv.id) {
      setInvoices(invoices.map(inv => inv.id === newInv.id ? newInv : inv));
    } else {
      setInvoices([...invoices, { ...newInv, id: Date.now() }]);
    }
    setShowInvoiceModal(false);
  };
  const deleteInvoice = (id) => {
    setInvoices(invoices.filter(inv => inv.id !== id));
  };

  const handleSendInvoice = async () => {
    const updated = { ...invoiceForm, status: 'paid' };
    setInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv));
    setInvoiceForm(updated);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Invoice', 10, 15);
    doc.setFontSize(12);
    doc.text(`From: ${user?.name || 'Corre User'}`, 10, 25);
    doc.text(`To: ${selectedClient.name} (${selectedClient.email})`, 10, 32);
    doc.text(`Due: ${invoiceForm.due}`, 10, 39);
    doc.text(`Status: Paid`, 10, 46);
    doc.text('Items:', 10, 55);
    let y = 62;
    invoiceForm.items.forEach((item, idx) => {
      doc.text(`${idx + 1}. ${item.desc} | Qty: ${item.qty} | Price: $${item.price.toFixed(2)}`, 12, y);
      y += 7;
    });
    doc.text(`Total: $${invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)}`, 10, y + 5);
    // Optionally, you can export the PDF and attach it to the email if you set up EmailJS for attachments

    const html = `
      <div style='font-family:sans-serif;max-width:600px;margin:auto;'>
        <h2 style='color:#16c784;'>Invoice</h2>
        <p><b>From:</b> ${user?.name || 'Corre User'}</p>
        <p><b>To:</b> ${selectedClient.name} (${selectedClient.email})</p>
        <p><b>Due:</b> ${invoiceForm.due}</p>
        <p><b>Status:</b> Paid</p>
        <table style='width:100%;border-collapse:collapse;margin-top:1em;'>
          <thead>
            <tr style='background:#f3f4f6;'>
              <th style='padding:8px;border:1px solid #eee;'>Description</th>
              <th style='padding:8px;border:1px solid #eee;'>Qty</th>
              <th style='padding:8px;border:1px solid #eee;'>Price</th>
              <th style='padding:8px;border:1px solid #eee;'>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceForm.items.map(item => `
              <tr>
                <td style='padding:8px;border:1px solid #eee;'>${item.desc}</td>
                <td style='padding:8px;border:1px solid #eee;text-align:center;'>${item.qty}</td>
                <td style='padding:8px;border:1px solid #eee;text-align:right;'>$${item.price.toFixed(2)}</td>
                <td style='padding:8px;border:1px solid #eee;text-align:right;'>$${(item.qty * item.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style='text-align:right;font-size:1.1em;margin-top:1em;'><b>Total: $${invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)}</b></p>
        <p style='margin-top:2em;color:#888;'>Thank you for your business!</p>
      </div>
    `;

    try {
      await emailjs.send(
        'service_jpwlq5v',
        'template_pwjfvzd',
        {
          invoice_id: invoiceForm.id || 'N/A',
          to_email: selectedClient.email,
          from_name: user?.name || 'Corre User',
          to_name: selectedClient.name,
          due: invoiceForm.due,
          status: 'Paid',
          items_html: invoiceForm.items.map(item => `
            <tr>
              <td style="padding:8px;border:1px solid #eee;">${item.desc}</td>
              <td style="padding:8px;border:1px solid #eee;text-align:center;">${item.qty}</td>
              <td style="padding:8px;border:1px solid #eee;text-align:right;">$${item.price.toFixed(2)}</td>
              <td style="padding:8px;border:1px solid #eee;text-align:right;">$${(item.qty * item.price).toFixed(2)}</td>
            </tr>
          `).join(''),
          total: invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2),
        },
        'dT2BPPE_cEQywVhQX'
      );
      alert('Invoice sent successfully!');
    } catch (err) {
      alert('Failed to send invoice email: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: 'auto', padding: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="action-btn" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1 style={{ marginLeft: '1rem' }}>Corre - Manage Clients</h1>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <aside style={{ flex: '1 1 300px', borderRight: '1px solid #ddd', paddingRight: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Clients</h2>
            <button className="action-btn" onClick={() => openClientModal()}>+ Add</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {clients.map(client => (
              <li
                key={client.id}
                onClick={() => setSelectedClient(client)}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  background: selectedClient?.id === client.id ? '#f0f0f0' : 'transparent',
                  marginBottom: '0.5rem',
                  borderRadius: '4px'
                }}
              >
                <strong>{client.name}</strong><br />
                <small>{client.email}</small>
              </li>
            ))}
            {clients.length === 0 && <p>No clients yet.</p>}
          </ul>
        </aside>
        <main style={{ flex: '2 1 600px', paddingLeft: '1rem' }}>
          {selectedClient ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Invoices for {selectedClient.name}</h2>
                <button className="action-btn" onClick={() => openInvoiceModal(selectedClient)}>+ New Invoice</button>
              </div>
              {invoices.filter(inv => inv.clientId === selectedClient.id).length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {invoices.filter(inv => inv.clientId === selectedClient.id).map(inv => (
                    <li
                      key={inv.id}
                      style={{ padding: '0.75rem', border: '1px solid #eee', borderRadius: '4px', marginBottom: '0.5rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>Invoice #{inv.id}</strong><br />
                          <small>Due: {inv.due} | Status: {inv.status} | Total: ${inv.total.toFixed(2)}</small>
                        </div>
                        <div>
                          <button className="action-btn" onClick={() => openInvoiceModal(selectedClient, inv)}>Edit</button>
                          <button className="action-btn" onClick={() => deleteInvoice(inv.id)} style={{ marginLeft: '0.5rem' }}>Delete</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>No invoices. Click New Invoice to start.</p>}
            </>
          ) : <p>Select a client to view invoices.</p>}
        </main>
      </div>

      {/* Client Modal */}
      {showClientModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '400px', margin: 'auto' }}>
            <h3>{clientForm.id ? 'Edit Client' : 'Add Client'}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label>Name</label><br />
              <input type="text" placeholder="Enter name" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Email</label><br />
              <input type="email" placeholder="Enter email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Notes</label><br />
              <textarea placeholder="Additional notes" value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} rows={4} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="action-btn" onClick={saveClient}>Save</button>
              <button className="action-btn" onClick={() => setShowClientModal(false)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="modal">
          <div className="modal-content invoice-dialog" style={{ maxWidth: '500px', margin: 'auto', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{textAlign:'center', fontSize:'1.4em', fontWeight:700}}>{invoiceForm.id ? 'Edit Invoice' : 'Create Invoice'}</h3>
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" value={selectedClient.name} disabled style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Client Email</label>
              <input type="email" value={selectedClient.email} disabled style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={invoiceForm.due} onChange={e => setInvoiceForm({ ...invoiceForm, due: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Items</label>
              {invoiceForm.items.map((item, idx) => (
                <div key={idx} className="item-row" style={{ display: 'flex', gap: '0.5em', marginBottom: '0.5em', alignItems: 'flex-end' }}>
                  <input className="description" placeholder="Description" value={item.desc} onChange={e => { const its = [...invoiceForm.items]; its[idx].desc = e.target.value; setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ flex: '2.5', padding: '0.75rem', fontSize: '1rem' }} />
                  <div style={{display:'flex',flexDirection:'column',flex:'1',minWidth:'60px',maxWidth:'80px'}}>
                    <label style={{fontSize:'0.85em',marginBottom:'0.2em'}}>Qty</label>
                    <input className="quantity" type="number" min="1" placeholder="Qty" value={item.qty} onChange={e => { const its = [...invoiceForm.items]; its[idx].qty = Number(e.target.value); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ padding: '0.75rem', fontSize: '1rem' }} />
                  </div>
                  <div style={{display:'flex',flexDirection:'column',flex:'1',minWidth:'80px',maxWidth:'100px'}}>
                    <label style={{fontSize:'0.85em',marginBottom:'0.2em'}}>Price</label>
                    <input className="price" type="number" min="0" step="0.01" placeholder="Price" value={item.price} onChange={e => { const its = [...invoiceForm.items]; its[idx].price = Math.max(0, Number(e.target.value)); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ padding: '0.75rem', fontSize: '1rem' }} />
                  </div>
                  <button onClick={() => { const its = invoiceForm.items.filter((_, i) => i !== idx); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', alignSelf:'center' }}>🗑️</button>
                </div>
              ))}
              <button onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { desc: '', qty: 1, price: 0 }] })} className="add-item-btn" style={{ background: '#16c784', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5em 1em', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5em', fontSize:'1em', alignSelf:'flex-start' }}>Add Item</button>
            </div>
            <div className="form-group">
              <label>Total Amount Due</label>
              <input type="text" value={`$${invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)}`} disabled style={{ width: '100%', padding: '0.75rem', fontSize: '1.1em', fontWeight:600, background:'#f3f4f6', borderRadius:'8px', marginBottom:'1em', textAlign:'right' }} />
            </div>
            <div className="payment-section" style={{ textAlign: 'center', marginTop: '1.5em' }}>
              <h4 style={{marginBottom:'0.5em'}}>Payment</h4>
              <QRCode value={wallet?.address || ''} size={80} />
              <div className="payment-address" style={{ fontSize: '0.95em', wordBreak: 'break-all', marginTop: '0.5em', color: '#555', background: '#f3f4f6', borderRadius: '6px', padding: '0.4em 0.6em', display: 'inline-block' }}>{wallet?.address}</div>
              <div className="payment-note" style={{ fontSize: '0.85em', color: '#888', marginTop: '0.2em' }}>Only send USDC on Solana</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop:'1.5em' }}>
              <button className="action-btn" onClick={handleSendInvoice} disabled={invoiceForm.status==='paid'} style={{ marginLeft: '0.5rem' }}>Send</button>
              {invoiceForm.status==='paid' && <button className="action-btn" onClick={() => { const upd={...invoiceForm, status:'pending'}; setInvoices(invoices.map(inv => inv.id === upd.id ? upd : inv)); setInvoiceForm(upd); }}>Mark Unpaid</button>}
              <button className="action-btn" onClick={saveInvoice}>Save Invoice</button>
              <button className="action-btn" onClick={() => setShowInvoiceModal(false)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageClients;
