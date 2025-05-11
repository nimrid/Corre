import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LandingPage() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <main>
      <div className="noise-overlay"></div>
      <header>
        <div className="logo">
          <h1>Corre</h1>
        </div>
        <button
          className="login-btn"
          onClick={login}
        >
          {isLoading ? 'Connecting...' : 'LOGIN'}
        </button>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h2 className="glitch-text">YOUR FREELANCE<br/>FUTURE STARTS HERE</h2>
          <p className="subtitle">The digital wallet that gets you paid in crypto,<br/>spent in fiat. Simple.</p>
        </div>
        <div className="hero-image">
          <div className="floating-elements">
            <div className="element coin">$</div>
            <div className="element laptop">💻</div>
            <div className="element globe">🌍</div>
            <div className="element rocket">🚀</div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>INSTANT PAYMENTS</h3>
          <p>Get paid in USDC & USDT</p>
        </div>
        <div className="feature-card">
          <h3>MOBILE MONEY</h3>
          <p>M-Pesa, MTN, Airtel</p>
        </div>
        <div className="feature-card">
          <h3>BANK TRANSFERS</h3>
          <p>Seamless fiat conversion</p>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;