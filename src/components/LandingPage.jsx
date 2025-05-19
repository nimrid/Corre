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
          <div className="hero-cta">
            <button className="login-btn" onClick={login}>
              {isLoading ? 'Connecting...' : 'GET STARTED'}
            </button>
            <p className="cta-subtext">No credit card required</p>
          </div>
        </div>
        <div className="hero-image">
          <img 
            src="https://hefafnsdx7xk1nzg.public.blob.vercel-storage.com/nfts/Freelancer%27s%20Carefree%20Success_simple_compose_01jv16p064ey19mxggcdgp6cv3-F0wyBKTxiBSQOa5DYGqFdxX5Z5TWpM.png" 
            alt="Freelancer earning from gigs" 
            style={{width: '100%', height: 'auto', borderRadius: '12px', border: '3px solid black', boxShadow: '8px 8px 0 black'}} 
          />
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">💸</div>
          <h3>INSTANT PAYMENTS</h3>
          <p>Get paid in USDC & USDT instantly from anywhere in the world</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>MOBILE MONEY</h3>
          <p>Convert to M-Pesa, MTN, Airtel and other mobile money services</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏦</div>
          <h3>BANK TRANSFERS</h3>
          <p>Seamless fiat conversion to your local bank account</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🧾</div>
          <h3>MANAGE CLIENTS & INVOICES</h3>
          <p>Create invoices and manage clients for seamless payment collection</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📈</div>
          <h3>EARN YIELDS</h3>
          <p>Earn passive income on your stablecoin balances</p>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign up & Create Wallet</h3>
            <p>Get started with your socials and receive a crypto wallet in seconds</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Manage Clients & Invoices</h3>
            <p>Create invoices, manage clients, and send payment requests</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get Paid & Earn Yields</h3>
            <p>Receive payments in USDC/USDT, convert to local currency, and earn yields on your balance</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2 className="section-title">Trusted by Freelancers</h2>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p className="quote">"Corre made it so easy to get paid from my international clients. The mobile money integration is a game-changer!"</p>
            <div className="author">- Sarah K., Digital Designer</div>
          </div>
          <div className="testimonial-card">
            <p className="quote">"Finally, a solution that bridges the gap between crypto and traditional banking. Highly recommended!"</p>
            <div className="author">- Michael T., Software Developer</div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="logo">
            <h1>Corre</h1>
          </div>
          <p className="footer-text">Your trusted partner in global payments</p>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;