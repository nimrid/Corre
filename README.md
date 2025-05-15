# Noone - Digital Wallet for Gig Workers

A modern digital wallet application built on the Solana blockchain, specifically designed for gig workers and freelancers. The platform enables users to receive, manage, and utilize their earnings in stablecoins (USDC and USDT) with seamless integration to traditional financial systems.

## Features

- **Authentication**: Secure login with email using Civic
- **Wallet Management**: Multi-currency support (USDC, USDT)
- **Payment Features**: Instant payments in stablecoins
- **Fiat Integration**: Mobile money and bank account integration
- **Financial Tools**: Savings, investment options, and cryptocurrency conversion

## Tech Stack

- **Frontend**: React, Vite
- **Authentication**: Civic auth web3
- **Blockchain**: Solana
- **Styling**: CSS with neobrutalist design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/noone.git
cd noone
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
noone/
├── src/
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── App.jsx           # Main application component
│   ├── index.jsx         # Application entry point
│   ├── index.html        # HTML template
│   └── styles.css        # Global styles
├── package.json          # Project dependencies
├── vite.config.js        # Vite configuration
└── README.md             # Project documentation
```

## Authentication Flow

1. User clicks the login button on the landing page
2. Civic authentication modal appears
3. User select a social login (Google)
4. Upon successful authentication, a wallet is created for the user
5. User is redirected to the dashboard

## Exact details of what users can do
1. Users can recieve funds using their wallet
2. Users can perform transactions with their wallet, make sure you have little SOL
3. Users can off-ramp to local bank, support only for Nigeria now but plans to expand to other african and LATAM countries
4. Support only stablecoins USDC, USDT
5. Users can earn DeFi yields on stablecoins
6. User who are freelancers can manage clients, send out invoices and collect payment via email

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
