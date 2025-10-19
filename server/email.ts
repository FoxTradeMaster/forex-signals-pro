import sgMail from '@sendgrid/mail';
import { storagePut } from './storage';
import * as fs from 'fs';
import * as path from 'path';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@foxtrademaster.com';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send welcome email with user guide to new premium subscriber
 */
export async function sendWelcomeEmail(
  toEmail: string,
  userName: string,
  subscriptionTier: 'monthly' | 'yearly'
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email] SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    // Upload user guide to S3 if not already uploaded
    const userGuidePath = '/home/ubuntu/forex-signals-app/FOXTRADEMASTER_User_Guide.pdf';
    let guideUrl = '';
    
    try {
      const guideBuffer = fs.readFileSync(userGuidePath);
      const { url } = await storagePut(
        'user-guides/FOX_TRADE_MASTER_User_Guide.pdf',
        guideBuffer,
        'application/pdf'
      );
      guideUrl = url;
    } catch (error) {
      console.error('[Email] Failed to upload user guide:', error);
      // Continue without guide URL
    }

    const subscriptionText = subscriptionTier === 'monthly' 
      ? 'Monthly ($99.95/month)' 
      : 'Yearly ($1,000/year)';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #ea580c 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #ea580c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .features {
      background: white;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .features ul {
      list-style: none;
      padding: 0;
    }
    .features li {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .features li:before {
      content: "✓ ";
      color: #ea580c;
      font-weight: bold;
      margin-right: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦊 Welcome to FOX TRADE MASTER!</h1>
  </div>
  
  <div class="content">
    <h2>Hi ${userName || 'Trader'},</h2>
    
    <p>Thank you for subscribing to <strong>FOX TRADE MASTER Premium</strong>! You now have full access to all 10 currency pairs and our advanced trading signals.</p>
    
    <p><strong>Your Subscription:</strong> ${subscriptionText}</p>
    
    <div class="features">
      <h3>What You Get:</h3>
      <ul>
        <li>All 10 major currency pairs unlocked</li>
        <li>4 advanced trading strategies (Swing, Day Trading, Trend Following, 24-Hour Momentum)</li>
        <li>Real-time signal generation every 15 minutes</li>
        <li>Audio & visual alerts for high-priority signals</li>
        <li>Market hours awareness and session tracking</li>
        <li>Entry price, stop loss, and take profit for every signal</li>
        <li>Signal strength ratings (1-10 scale)</li>
      </ul>
    </div>
    
    <h3>🎁 Your FREE User Guide</h3>
    <p>As a premium subscriber, you get <strong>FREE access to the complete FOX TRADE MASTER User Guide</strong> (valued at $29.99)!</p>
    
    ${guideUrl ? `
    <p style="text-align: center;">
      <a href="${guideUrl}" class="button">Download Your Free Guide</a>
    </p>
    ` : ''}
    
    <p>This comprehensive guide includes:</p>
    <ul>
      <li>Step-by-step setup instructions</li>
      <li>Detailed strategy explanations</li>
      <li>Signal interpretation guide</li>
      <li>Risk management best practices</li>
      <li>Daily trading routine templates</li>
      <li>Common mistakes to avoid</li>
    </ul>
    
    <h3>🚀 Get Started Now</h3>
    <p style="text-align: center;">
      <a href="https://foxtrademaster.com" class="button">Access FOX TRADE MASTER</a>
    </p>
    
    <p><strong>Quick Start Tips:</strong></p>
    <ol>
      <li>Log in to <a href="https://foxtrademaster.com">FoxTradeMaster.com</a></li>
      <li>Click "Generate Signals" to see live trading opportunities</li>
      <li>Enable audio alerts for high-priority signals (strength 7+)</li>
      <li>Start with signals that have multi-strategy confirmation</li>
      <li>Always use the stop loss and take profit levels provided</li>
    </ol>
    
    <p><strong>Need Help?</strong><br>
    Reply to this email or contact us at <a href="mailto:support@foxtrademaster.com">support@foxtrademaster.com</a></p>
    
    <p>Happy trading!<br>
    <strong>The FOX TRADE MASTER Team</strong> 🦊</p>
  </div>
  
  <div class="footer">
    <p><strong>FOX TRADE MASTER</strong><br>
    Advanced Forex Trading Signals<br>
    <a href="https://foxtrademaster.com">FoxTradeMaster.com</a></p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
    <strong>Disclaimer:</strong> Trading forex involves substantial risk of loss. Past performance is not indicative of future results. 
    FOX TRADE MASTER signals are tools, not guarantees of profit. Always perform your own research and manage your risk appropriately.
    </p>
  </div>
</body>
</html>
    `;

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: '🦊 Welcome to FOX TRADE MASTER Premium - Your User Guide Inside!',
      html: emailHtml,
      text: `Welcome to FOX TRADE MASTER Premium!

Thank you for subscribing! You now have full access to all 10 currency pairs and advanced trading signals.

Your Subscription: ${subscriptionText}

As a premium subscriber, you get FREE access to the complete FOX TRADE MASTER User Guide!

${guideUrl ? `Download your guide: ${guideUrl}` : ''}

Get started now at https://foxtrademaster.com

Need help? Contact us at support@foxtrademaster.com

Happy trading!
The FOX TRADE MASTER Team`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Welcome email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Send subscription expiry reminder email
 */
export async function sendExpiryReminderEmail(
  toEmail: string,
  userName: string,
  daysUntilExpiry: number
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email] SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #ea580c 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #ea580c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Subscription Expiring Soon</h1>
  </div>
  
  <div class="content">
    <h2>Hi ${userName || 'Trader'},</h2>
    
    <div class="warning">
      <p><strong>Your FOX TRADE MASTER Premium subscription expires in ${daysUntilExpiry} days.</strong></p>
    </div>
    
    <p>Don't lose access to:</p>
    <ul>
      <li>All 10 currency pairs</li>
      <li>Real-time trading signals</li>
      <li>Advanced momentum analysis</li>
      <li>Audio & visual alerts</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="https://foxtrademaster.com/premium" class="button">Renew Now</a>
    </p>
    
    <p>Questions? Contact us at <a href="mailto:support@foxtrademaster.com">support@foxtrademaster.com</a></p>
    
    <p>Best regards,<br>
    <strong>The FOX TRADE MASTER Team</strong> 🦊</p>
  </div>
</body>
</html>
    `;

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `⏰ Your FOX TRADE MASTER subscription expires in ${daysUntilExpiry} days`,
      html: emailHtml,
      text: `Your FOX TRADE MASTER Premium subscription expires in ${daysUntilExpiry} days.

Renew now to keep access to all 10 currency pairs and advanced trading signals.

Renew at: https://foxtrademaster.com/premium

Questions? Contact support@foxtrademaster.com`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Expiry reminder sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send expiry reminder:', error);
    return false;
  }
}

