# FOX TRADE MASTER™ - Professional Forex Trading Signals

Advanced forex trading signals platform with real-time market analysis, 24-hour momentum windows, and tier-based subscription access.

## 🎯 Features

### 3-Tier Subscription System
- **Free**: 1 currency pair (EUR/USD)
- **Premium**: 10 major currency pairs ($99.95/month, $1,000/year)
- **Pro**: 156 currency pairs - 28 major + 38 minor + 90 exotic ($299/month, $2,500/year)

### Advanced Trading Features
- Real-time forex data via Polygon.io API
- 24-hour momentum window analysis
- Session-based trading signals (Asian, London, New York)
- Multi-strategy signal generation
- Market hours tracking
- Audio/visual alerts
- Auto-refresh signals

### Technical Stack
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Node.js 22 + Express 4 + tRPC 11
- **Database**: PostgreSQL (Render) / TiDB (Manus)
- **Auth**: OAuth 2.0
- **Payments**: PayPal integration
- **Data**: Polygon.io forex API

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- pnpm 10+
- PostgreSQL database
- Polygon.io API key
- PayPal credentials

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/forex-signals-app.git
cd forex-signals-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Polygon.io API
POLYGON_API_KEY=your_polygon_api_key

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET_KEY=your_paypal_secret_key
PAYPAL_MODE=sandbox # or 'live' for production

# Authentication
JWT_SECRET=your_jwt_secret_key
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=your_app_id
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@foxtrademaster.com

# App Configuration
VITE_APP_TITLE=FOX TRADE MASTER™
VITE_APP_LOGO=/logo.svg
```

## 📦 Deployment

### Render Deployment

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Copy `DATABASE_URL`

2. **Create Web Service**
   - Connect GitHub repository
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Add all environment variables

3. **Set up Deploy Hook**
   - Copy deploy hook URL from Render
   - Add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`

4. **Configure Custom Domain**
   - Add custom domain in Render dashboard
   - Update DNS records:
     - CNAME: `www` → `your-app.onrender.com`
     - A: `@` → Render IP address

### GitHub Actions CI/CD

The repository includes automated deployment via GitHub Actions:

1. Push to `main` branch triggers deployment
2. Runs tests and builds project
3. Deploys to Render automatically

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  subscriptionTier ENUM('free', 'premium', 'pro') DEFAULT 'free',
  subscriptionExpiry TIMESTAMP,
  paypalSubscriptionId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW(),
  lastSignedIn TIMESTAMP DEFAULT NOW()
);

-- Signals table
CREATE TABLE signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pair VARCHAR(10) NOT NULL,
  direction ENUM('BUY', 'SELL') NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  strength INT NOT NULL,
  entryPrice DECIMAL(10, 5) NOT NULL,
  stopLoss DECIMAL(10, 5) NOT NULL,
  takeProfit DECIMAL(10, 5) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  session VARCHAR(20),
  reasoning TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  pair VARCHAR(10) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm db:push      # Push database schema changes

# Testing
pnpm test         # Run tests
pnpm lint         # Run linter
```

### Project Structure

```
forex-signals-app/
├── client/               # Frontend React app
│   ├── public/          # Static assets
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable components
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilities
├── server/              # Backend Express + tRPC
│   ├── _core/          # Core framework files
│   ├── routers.ts      # tRPC routes
│   ├── db.ts           # Database queries
│   ├── polygonForexData.ts  # Polygon.io integration
│   ├── signalEngine.ts # Signal generation
│   └── paypal.ts       # PayPal integration
├── drizzle/            # Database schema
├── shared/             # Shared types/constants
└── .github/            # GitHub Actions workflows
```

## 📊 API Endpoints

### tRPC Procedures

```typescript
// Authentication
trpc.auth.me.useQuery()
trpc.auth.logout.useMutation()

// Subscription
trpc.subscription.getStatus.useQuery()
trpc.subscription.createOrder.useMutation()
trpc.subscription.captureOrder.useMutation()

// Forex Data
trpc.forex.getPairs.useQuery()
trpc.forex.getPairData.useQuery({ pair: 'EUR/USD' })
trpc.forex.getAllData.useQuery()

// Signals
trpc.signals.generateAll.useMutation()
trpc.signals.generateForPair.useMutation({ pair: 'EUR/USD' })
trpc.signals.getActive.useQuery()

// Market Hours
trpc.marketHours.getStatus.useQuery({ pair: 'EUR/USD' })
trpc.marketHours.getAllPairStatuses.useQuery()
```

## 🔐 Security

- Environment variables for sensitive data
- JWT-based authentication
- OAuth 2.0 integration
- Secure PayPal payment processing
- HTTPS enforced in production

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@foxtrademaster.com

---

**Built with ❤️ by FOX TRADE MASTER™ Team**
