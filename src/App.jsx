import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CivicAuthProvider } from '@civic/auth-web3/react';
import { WalletProvider } from './context/WalletContext.jsx';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Pools from './components/Pools';
import Send from './components/Send';
import SendWallet from './components/SendWallet';
import ManageClients from './components/ManageClients';
import SendBank from './components/SendBank';
import { ConnectivityProvider } from './context/ConnectivityContext';
import './styles.css';

function App() {
  return (
    <ConnectivityProvider>
      <CivicAuthProvider clientId="d1be3da3-4156-4c07-9a73-a81a64478192">
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/*"
              element={
                <WalletProvider>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/manageclients" element={<ManageClients />} />
                    <Route path="/send" element={<Send />} />
                    <Route path="/send/wallet" element={<SendWallet />} />
                    <Route path="/transfer" element={<SendBank />} />
                    <Route path="/pools" element={<Pools />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </WalletProvider>
              }
            />
          </Routes>
        </Router>
      </CivicAuthProvider>
    </ConnectivityProvider>
  );
}

export default App; 