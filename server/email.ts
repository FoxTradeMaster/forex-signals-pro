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
  subscriptionTier: 'monthly' | 'yearly' | 'pro_monthly' | 'pro_yearly'
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

    let subscriptionText: string;
    let tierName: string;
    let pairCount: number;
    
    switch (subscriptionTier) {
      case 'monthly':
        subscriptionText = 'Premium Monthly ($99.95/month)';
        tierName = 'Premium';
        pairCount = 10;
        break;
      case 'yearly':
        subscriptionText = 'Premium Yearly ($1,000/year)';
        tierName = 'Premium';
        pairCount = 10;
        break;
      case 'pro_monthly':
        subscriptionText = 'Pro Monthly ($299/month)';
        tierName = 'Pro';
        pairCount = 156;
        break;
      case 'pro_yearly':
        subscriptionText = 'Pro Yearly ($2,500/year)';
        tierName = 'Pro';
        pairCount = 156;
        break;
      default:
        subscriptionText = 'Premium Monthly ($99.95/month)';
        tierName = 'Premium';
        pairCount = 10;
    }

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
    
    <p>Thank you for subscribing to <strong>FOX TRADE MASTER ${tierName}</strong>! You now have full access to all ${pairCount} currency pairs and our advanced trading signals.</p>
    
    <p><strong>Your Subscription:</strong> ${subscriptionText}</p>
    
    <div class="features">
      <h3>What You Get:</h3>
      <ul>
        <li>All ${pairCount} currency pairs unlocked ${pairCount === 156 ? '(28 major + 38 minor + 90 exotic)' : ''}</li>
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
      subject: `🦊 Welcome to FOX TRADE MASTER ${tierName} - Your User Guide Inside!`,
      html: emailHtml,
      text: `Welcome to FOX TRADE MASTER ${tierName}!

Thank you for subscribing! You now have full access to all ${pairCount} currency pairs and advanced trading signals.

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


/**
 * Send weekly performance report to premium user
 */
export async function sendWeeklyPerformanceReport(
  toEmail: string,
  userName: string,
  performanceData: {
    totalSignals: number;
    winRate: number;
    totalPL: number;
    avgPL: number;
    bestSignal: {
      pair: string;
      signalType: string;
      plDollars: number;
      plPips: number;
    } | null;
    worstSignal: {
      pair: string;
      signalType: string;
      plDollars: number;
      plPips: number;
    } | null;
  }
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email] SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const { totalSignals, winRate, totalPL, avgPL, bestSignal, worstSignal } = performanceData;
    
    // Determine credibility badge
    let credibilityBadge = "Building Track Record";
    let badgeColor = "#6b7280";
    if (winRate >= 80) {
      credibilityBadge = "🏆 Elite Performer";
      badgeColor = "#10b981";
    } else if (winRate >= 70) {
      credibilityBadge = "⭐ Excellent Trader";
      badgeColor = "#3b82f6";
    } else if (winRate >= 60) {
      credibilityBadge = "✓ Good Performance";
      badgeColor = "#8b5cf6";
    }

    const plColor = totalPL >= 0 ? "#10b981" : "#ef4444";
    const plSign = totalPL >= 0 ? "+" : "";

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
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin: 15px 0;
    }
    .signal-highlight {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
      border-left: 4px solid;
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
    <h1>📊 Your Weekly Performance Report</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">FOX TRADE MASTER™</p>
  </div>
  
  <div class="content">
    <h2>Hi ${userName || 'Trader'},</h2>
    
    <p>Here's your trading performance summary for the past 7 days:</p>
    
    <div style="text-align: center;">
      <span class="badge" style="background-color: ${badgeColor}; color: white;">
        ${credibilityBadge}
      </span>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Signals</div>
        <div class="stat-value">${totalSignals}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value" style="color: ${winRate >= 60 ? '#10b981' : '#ef4444'};">
          ${winRate.toFixed(1)}%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" style="color: ${plColor};">
          ${plSign}$${Math.abs(totalPL).toFixed(2)}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Avg P/L</div>
        <div class="stat-value" style="color: ${avgPL >= 0 ? '#10b981' : '#ef4444'};">
          ${avgPL >= 0 ? '+' : ''}$${avgPL.toFixed(2)}
        </div>
      </div>
    </div>
    
    ${bestSignal ? `
    <h3>🏆 Best Signal of the Week</h3>
    <div class="signal-highlight" style="border-left-color: #10b981;">
      <strong>${bestSignal.pair}</strong> - ${bestSignal.signalType}<br>
      <span style="color: #10b981; font-size: 18px; font-weight: bold;">
        +$${bestSignal.plDollars.toFixed(2)} (${bestSignal.plPips.toFixed(1)} pips)
      </span>
    </div>
    ` : ''}
    
    ${worstSignal && worstSignal.plDollars < 0 ? `
    <h3>📉 Worst Signal of the Week</h3>
    <div class="signal-highlight" style="border-left-color: #ef4444;">
      <strong>${worstSignal.pair}</strong> - ${worstSignal.signalType}<br>
      <span style="color: #ef4444; font-size: 18px; font-weight: bold;">
        -$${Math.abs(worstSignal.plDollars).toFixed(2)} (${worstSignal.plPips.toFixed(1)} pips)
      </span>
    </div>
    ` : ''}
    
    <h3>💡 Keep Improving</h3>
    <p>Review your signal history to identify patterns and refine your trading strategy:</p>
    
    <p style="text-align: center;">
      <a href="https://foxtrademaster.com/history" class="button">View Full Signal History</a>
    </p>
    
    <p><strong>Trading Tips:</strong></p>
    <ul>
      <li>Focus on high-strength signals (7+ rating) for better win rates</li>
      <li>Always use stop-loss orders to protect your capital</li>
      <li>Review both winning and losing trades to learn from each</li>
      <li>Consider market session timing for optimal entry points</li>
    </ul>
    
    <p>Questions or feedback? Reply to this email or contact us at <a href="mailto:support@foxtrademaster.com">support@foxtrademaster.com</a></p>
    
    <p>Keep trading smart!<br>
    <strong>The FOX TRADE MASTER Team</strong> 🦊</p>
  </div>
  
  <div class="footer">
    <p><strong>FOX TRADE MASTER™</strong><br>
    Advanced Forex Trading Signals<br>
    <a href="https://foxtrademaster.com">FoxTradeMaster.com</a></p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
    This is an automated weekly performance report. To unsubscribe from these emails, 
    please update your preferences in your account settings.
    </p>
  </div>
</body>
</html>
    `;

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `📊 Your Weekly Trading Performance - ${winRate.toFixed(1)}% Win Rate`,
      html: emailHtml,
      text: `Your Weekly Performance Report - FOX TRADE MASTER

Hi ${userName || 'Trader'},

Here's your trading performance for the past 7 days:

Total Signals: ${totalSignals}
Win Rate: ${winRate.toFixed(1)}%
Total P/L: ${plSign}$${Math.abs(totalPL).toFixed(2)}
Average P/L: ${avgPL >= 0 ? '+' : ''}$${avgPL.toFixed(2)}

${bestSignal ? `Best Signal: ${bestSignal.pair} ${bestSignal.signalType} (+$${bestSignal.plDollars.toFixed(2)})` : ''}
${worstSignal && worstSignal.plDollars < 0 ? `Worst Signal: ${worstSignal.pair} ${worstSignal.signalType} (-$${Math.abs(worstSignal.plDollars).toFixed(2)})` : ''}

View your full signal history at: https://foxtrademaster.com/history

Keep trading smart!
The FOX TRADE MASTER Team`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Weekly performance report sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send weekly performance report:', error);
    return false;
  }
}

/**
 * Send monthly performance report to premium user
 */
export async function sendMonthlyPerformanceReport(
  toEmail: string,
  userName: string,
  performanceData: {
    totalSignals: number;
    winRate: number;
    totalPL: number;
    avgPL: number;
    bestSignal: {
      pair: string;
      signalType: string;
      plDollars: number;
      plPips: number;
    } | null;
    worstSignal: {
      pair: string;
      signalType: string;
      plDollars: number;
      plPips: number;
    } | null;
  }
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('[Email] SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const { totalSignals, winRate, totalPL, avgPL, bestSignal, worstSignal } = performanceData;
    
    // Determine credibility badge
    let credibilityBadge = "Building Track Record";
    let badgeColor = "#6b7280";
    if (winRate >= 80) {
      credibilityBadge = "🏆 Elite Performer";
      badgeColor = "#10b981";
    } else if (winRate >= 70) {
      credibilityBadge = "⭐ Excellent Trader";
      badgeColor = "#3b82f6";
    } else if (winRate >= 60) {
      credibilityBadge = "✓ Good Performance";
      badgeColor = "#8b5cf6";
    }

    const plColor = totalPL >= 0 ? "#10b981" : "#ef4444";
    const plSign = totalPL >= 0 ? "+" : "";

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
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin: 15px 0;
    }
    .signal-highlight {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
      border-left: 4px solid;
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
    .achievement {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 2px solid #fbbf24;
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
    <h1>🎯 Your Monthly Performance Report</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">FOX TRADE MASTER™</p>
  </div>
  
  <div class="content">
    <h2>Hi ${userName || 'Trader'},</h2>
    
    <p>Congratulations on completing another month of trading! Here's your comprehensive performance summary for the past 30 days:</p>
    
    <div style="text-align: center;">
      <span class="badge" style="background-color: ${badgeColor}; color: white;">
        ${credibilityBadge}
      </span>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Signals</div>
        <div class="stat-value">${totalSignals}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value" style="color: ${winRate >= 60 ? '#10b981' : '#ef4444'};">
          ${winRate.toFixed(1)}%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" style="color: ${plColor};">
          ${plSign}$${Math.abs(totalPL).toFixed(2)}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Avg P/L</div>
        <div class="stat-value" style="color: ${avgPL >= 0 ? '#10b981' : '#ef4444'};">
          ${avgPL >= 0 ? '+' : ''}$${avgPL.toFixed(2)}
        </div>
      </div>
    </div>
    
    ${winRate >= 70 ? `
    <div class="achievement">
      <h3 style="margin-top: 0;">🎉 Outstanding Performance!</h3>
      <p>You've achieved a ${winRate.toFixed(1)}% win rate this month - that's exceptional! Keep up the great work and continue following your proven strategies.</p>
    </div>
    ` : ''}
    
    ${bestSignal ? `
    <h3>🏆 Best Signal of the Month</h3>
    <div class="signal-highlight" style="border-left-color: #10b981;">
      <strong>${bestSignal.pair}</strong> - ${bestSignal.signalType}<br>
      <span style="color: #10b981; font-size: 18px; font-weight: bold;">
        +$${bestSignal.plDollars.toFixed(2)} (${bestSignal.plPips.toFixed(1)} pips)
      </span>
    </div>
    ` : ''}
    
    ${worstSignal && worstSignal.plDollars < 0 ? `
    <h3>📉 Biggest Loss of the Month</h3>
    <div class="signal-highlight" style="border-left-color: #ef4444;">
      <strong>${worstSignal.pair}</strong> - ${worstSignal.signalType}<br>
      <span style="color: #ef4444; font-size: 18px; font-weight: bold;">
        -$${Math.abs(worstSignal.plDollars).toFixed(2)} (${worstSignal.plPips.toFixed(1)} pips)
      </span>
    </div>
    ` : ''}
    
    <h3>📈 Monthly Insights</h3>
    <p>Based on your ${totalSignals} signals this month:</p>
    <ul>
      <li><strong>Consistency:</strong> ${totalSignals >= 20 ? 'Excellent signal volume' : 'Consider increasing your trading frequency'}</li>
      <li><strong>Win Rate:</strong> ${winRate >= 60 ? 'Above industry average - great job!' : 'Focus on high-strength signals to improve'}</li>
      <li><strong>Profitability:</strong> ${totalPL >= 0 ? 'Positive month - keep building momentum' : 'Review your risk management strategy'}</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="https://foxtrademaster.com/history" class="button">View Full Signal History</a>
    </p>
    
    <h3>💡 Next Month's Goals</h3>
    <p>To continue improving your trading performance:</p>
    <ul>
      <li>Maintain or improve your ${winRate.toFixed(1)}% win rate</li>
      <li>Focus on signals with multi-strategy confirmation</li>
      <li>Review your best trades to identify successful patterns</li>
      <li>Adjust position sizing based on signal strength</li>
      <li>Stay disciplined with stop-loss orders</li>
    </ul>
    
    <p>Thank you for being a valued FOX TRADE MASTER member. We're here to support your trading journey!</p>
    
    <p>Questions or feedback? Reply to this email or contact us at <a href="mailto:support@foxtrademaster.com">support@foxtrademaster.com</a></p>
    
    <p>Here's to an even better month ahead!<br>
    <strong>The FOX TRADE MASTER Team</strong> 🦊</p>
  </div>
  
  <div class="footer">
    <p><strong>FOX TRADE MASTER™</strong><br>
    Advanced Forex Trading Signals<br>
    <a href="https://foxtrademaster.com">FoxTradeMaster.com</a></p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
    This is an automated monthly performance report. To unsubscribe from these emails, 
    please update your preferences in your account settings.
    </p>
  </div>
</body>
</html>
    `;

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `🎯 Your Monthly Trading Report - ${totalSignals} Signals, ${winRate.toFixed(1)}% Win Rate`,
      html: emailHtml,
      text: `Your Monthly Performance Report - FOX TRADE MASTER

Hi ${userName || 'Trader'},

Here's your trading performance for the past 30 days:

Total Signals: ${totalSignals}
Win Rate: ${winRate.toFixed(1)}%
Total P/L: ${plSign}$${Math.abs(totalPL).toFixed(2)}
Average P/L: ${avgPL >= 0 ? '+' : ''}$${avgPL.toFixed(2)}

${bestSignal ? `Best Signal: ${bestSignal.pair} ${bestSignal.signalType} (+$${bestSignal.plDollars.toFixed(2)})` : ''}
${worstSignal && worstSignal.plDollars < 0 ? `Worst Signal: ${worstSignal.pair} ${worstSignal.signalType} (-$${Math.abs(worstSignal.plDollars).toFixed(2)})` : ''}

View your full signal history at: https://foxtrademaster.com/history

Here's to an even better month ahead!
The FOX TRADE MASTER Team`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Monthly performance report sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send monthly performance report:', error);
    return false;
  }
}
