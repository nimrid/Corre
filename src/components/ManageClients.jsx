import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import QRCode from 'react-qr-code';

function ManageClients() {
  const navigate = useNavigate();
  const { wallet } = useWallet();

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

  const handleSendInvoice = () => {
    const updated = { ...invoiceForm, status: 'paid' };
    setInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv));
    setInvoiceForm(updated);
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
          <div className="modal-content" style={{ maxWidth: '500px', margin: 'auto', maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }}>
            <h3>{invoiceForm.id ? 'Edit Invoice' : 'Create Invoice'}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label>Client Name</label><br />
              <input type="text" value={selectedClient.name} disabled style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Client Email</label><br />
              <input type="email" value={selectedClient.email} disabled style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Due Date</label><br />
              <input type="date" value={invoiceForm.due} onChange={e => setInvoiceForm({ ...invoiceForm, due: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Items</label>
              {invoiceForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5em', marginBottom: '0.5em' }}>
                  <input placeholder="Description" value={item.desc} onChange={e => { const its = [...invoiceForm.items]; its[idx].desc = e.target.value; setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ flex: '2', padding: '0.75rem', fontSize: '1rem' }} />
                  <input type="number" placeholder="Quantity" value={item.qty} onChange={e => { const its = [...invoiceForm.items]; its[idx].qty = Number(e.target.value); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ flex: '1', padding: '0.75rem', fontSize: '1rem' }} />
                  <input type="number" placeholder="Price" value={item.price} onChange={e => { const its = [...invoiceForm.items]; its[idx].price = Number(e.target.value); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ flex: '0.5', padding: '0.75rem', fontSize: '1rem' }} />
                  <button onClick={() => { const its = invoiceForm.items.filter((_, i) => i !== idx); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ background: 'none', border: 'none', fontSize: '1.25rem' }}>🗑️</button>
                </div>
              ))}
              <button onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { desc: '', qty: 1, price: 0 }] })} className="action-btn">Add Item</button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Total Amount Due</label><br />
              <input type="text" value={`$${invoiceForm.items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)}`} disabled style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <h4>Payment</h4>
              <QRCode value={wallet?.address || ''} size={80} />
              <p style={{ wordBreak: 'break-all' }}>{wallet?.address}</p>
              <p>Only send USDC on Solana</p>
              
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
