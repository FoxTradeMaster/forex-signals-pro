# FOX TRADE MASTER™ - Deployment Guide

Complete guide for deploying to production with GitHub + Render + Polygon.io

## Prerequisites

Before starting, ensure you have:

- ✅ GitHub account
- ✅ Render account (https://render.com)
- ✅ Polygon.io API key (https://polygon.io)
- ✅ PayPal Business account with API credentials
- ✅ SendGrid account for email (optional)
- ✅ Domain name (foxtrademaster.com)

---

## Step 1: GitHub Repository Setup

### 1.1 Create GitHub Repository

```bash
# Initialize git (if not already done)
cd /home/ubuntu/forex-signals-app
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - FOX TRADE MASTER™ with Polygon.io integration"

# Create GitHub repository (via GitHub CLI or web interface)
gh repo create forex-signals-app --private --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

### 1.2 Add GitHub Secrets

Go to GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string from Render |
| `POLYGON_API_KEY` | Your Polygon.io API key | For forex data |
| `PAYPAL_CLIENT_ID` | Your PayPal client ID | For payments |
| `PAYPAL_SECRET_KEY` | Your PayPal secret key | For payments |
| `PAYPAL_MODE` | `live` | Production mode |
| `JWT_SECRET` | Random 64-char string | Session encryption |
| `SENDGRID_API_KEY` | Your SendGrid API key | Email service |
| `FROM_EMAIL` | `noreply@foxtrademaster.com` | Sender email |
| `VITE_APP_ID` | Your OAuth app ID | Authentication |
| `OAUTH_SERVER_URL` | `https://api.manus.im` | OAuth server |
| `VITE_OAUTH_PORTAL_URL` | `https://portal.manus.im` | OAuth portal |
| `OWNER_OPEN_ID` | Your owner ID | Admin access |
| `OWNER_NAME` | Your name | Admin name |
| `RENDER_DEPLOY_HOOK_URL` | Deploy hook from Render | Auto-deployment |

---

## Step 2: Render Setup

### 2.1 Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Configure:
   - **Name**: `forex-db`
   - **Database**: `forex_signals`
   - **User**: `forex_admin`
   - **Region**: Oregon (or closest to your users)
   - **Plan**: Starter ($7/month) or higher
3. Click **Create Database**
4. Wait for provisioning (2-3 minutes)
5. **Copy the Internal Database URL** (starts with `postgresql://`)

### 2.2 Create Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `forex-signals-app`
   - **Region**: Same as database (Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Starter ($7/month) or higher

4. Add Environment Variables:

Click **Advanced** → **Add Environment Variable**

| Key | Value |
|-----|-------|
| `NODE_VERSION` | `22.13.0` |
| `PNPM_VERSION` | `10.4.1` |
| `DATABASE_URL` | Paste Internal Database URL from Step 2.1 |
| `POLYGON_API_KEY` | Your Polygon.io API key |
| `PAYPAL_CLIENT_ID` | Your PayPal client ID |
| `PAYPAL_SECRET_KEY` | Your PayPal secret key |
| `PAYPAL_MODE` | `live` |
| `JWT_SECRET` | Generate random 64-char string |
| `SENDGRID_API_KEY` | Your SendGrid API key |
| `FROM_EMAIL` | `noreply@foxtrademaster.com` |
| `VITE_APP_TITLE` | `FOX TRADE MASTER™` |
| `VITE_APP_LOGO` | `/logo.svg` |
| `VITE_APP_ID` | Your OAuth app ID |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | `https://portal.manus.im` |
| `OWNER_OPEN_ID` | Your owner ID |
| `OWNER_NAME` | Your name |

5. Click **Create Web Service**

### 2.3 Wait for First Deploy

- Initial deployment takes 5-10 minutes
- Monitor logs in Render dashboard
- Once deployed, you'll see a URL like `https://forex-signals-app.onrender.com`

### 2.4 Push Database Schema

After first deployment, run migrations:

```bash
# Connect to Render shell
# Or run locally with production DATABASE_URL
pnpm db:push
```

---

## Step 3: Custom Domain Setup

### 3.1 Add Domain in Render

1. Go to your web service in Render
2. Click **Settings** → **Custom Domain**
3. Add domains:
   - `foxtrademaster.com`
   - `www.foxtrademaster.com`

### 3.2 Update DNS Records

Go to your domain registrar (GoDaddy, Namecheap, etc.) and add:

**For root domain (foxtrademaster.com):**
- Type: `A`
- Name: `@`
- Value: `216.24.57.1` (Render's IP)

**For www subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: `forex-signals-app.onrender.com`

**Wait 10-60 minutes for DNS propagation**

### 3.3 Verify SSL Certificate

Render automatically provisions SSL certificates via Let's Encrypt.

Check status in Render dashboard → Custom Domain section.

---

## Step 4: GitHub Actions CI/CD

### 4.1 Get Render Deploy Hook

1. Go to Render dashboard → Your web service
2. Click **Settings** → **Deploy Hook**
3. Copy the deploy hook URL
4. Add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`

### 4.2 Test Automatic Deployment

```bash
# Make a small change
echo "# Test deployment" >> README.md

# Commit and push
git add .
git commit -m "Test auto-deployment"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build project
3. Trigger Render deployment
4. Deploy to production

Monitor progress in:
- GitHub: Actions tab
- Render: Logs tab

---

## Step 5: Production Verification

### 5.1 Test Website

Visit https://foxtrademaster.com and verify:

- ✅ Site loads correctly
- ✅ Login/signup works
- ✅ Forex signals display
- ✅ PayPal payment flow works
- ✅ All 3 tiers accessible
- ✅ Polygon.io data loading
- ✅ Mobile responsive

### 5.2 Test Payment Flow

1. Create test account
2. Subscribe to Premium ($99.95)
3. Verify PayPal redirect
4. Complete payment
5. Check subscription activation
6. Verify access to 10 pairs

### 5.3 Monitor Performance

**Render Metrics:**
- CPU usage
- Memory usage
- Response times
- Error rates

**Polygon.io Usage:**
- API call count
- Rate limits
- Data quality

---

## Step 6: Post-Deployment

### 6.1 Set up Monitoring

**Render Alerts:**
- Configure email alerts for downtime
- Set up Slack notifications

**Database Backups:**
- Render automatically backs up PostgreSQL
- Verify backup schedule in dashboard

### 6.2 Configure Scaling

**Auto-scaling (if needed):**
- Render can auto-scale based on traffic
- Configure in Settings → Scaling

**Database scaling:**
- Monitor connection pool usage
- Upgrade plan if needed

### 6.3 Documentation

Update internal documentation:
- Deployment procedures
- Environment variables
- API credentials
- Emergency contacts

---

## Troubleshooting

### Build Fails

```bash
# Check build logs in Render
# Common issues:
- Missing environment variables
- Node version mismatch
- pnpm installation errors

# Solution:
- Verify all env vars are set
- Check NODE_VERSION=22.13.0
- Clear build cache in Render
```

### Database Connection Errors

```bash
# Verify DATABASE_URL format
postgresql://user:password@host:5432/database

# Check database status in Render
# Ensure web service and database are in same region
```

### Polygon.io API Errors

```bash
# Verify API key is correct
# Check API usage limits
# Ensure POLYGON_API_KEY is set in Render
```

### PayPal Payment Issues

```bash
# Verify PayPal credentials
# Check PAYPAL_MODE is set to 'live'
# Test in sandbox first with PAYPAL_MODE='sandbox'
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor error logs
- Check API usage
- Review payment transactions

**Monthly:**
- Database performance review
- Security updates
- Dependency updates

**Quarterly:**
- Backup verification
- Disaster recovery test
- Performance optimization

---

## Support

For deployment issues:
- GitHub Issues: https://github.com/YOUR_USERNAME/forex-signals-app/issues
- Email: support@foxtrademaster.com

---

**Deployment Complete! 🎉**

Your FOX TRADE MASTER™ platform is now live at https://foxtrademaster.com
