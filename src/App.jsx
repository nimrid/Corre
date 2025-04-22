import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import './styles.css';

const PRIVY_APP_ID = 'cm9jlcquu02arle0mt3abqs5e';

function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#FF5B5B',
        },
        embeddedWallets: {
          createOnLogin: true,
          noPromptOnSignature: true,
          chains: ['solana'],
        },
        turnstile: {
          siteKey: '1x00000000000000000000AA',
          theme: 'light',
          size: 'normal',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </PrivyProvider>
  );
}

export default App; 