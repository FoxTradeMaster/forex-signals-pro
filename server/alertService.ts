import { getActiveSignals, getSignalPerformance, getUserAlertPreferences, logAlert, getUser } from "./db";
import sgMail from '@sendgrid/mail';
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

// Initialize SendGrid
if (ENV.sendgridApiKey) {
  sgMail.setApiKey(ENV.sendgridApiKey);
}

/**
 * Alert Service - Monitors signals and triggers notifications
 * when P/L thresholds are reached
 */

interface AlertCheck {
  signalId: string;
  pair: string;
  signalType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  plDollars: number;
  plPercentage: number;
}

/**
 * Check if a signal has hit its take profit target
 */
function hasProfitTargetHit(check: AlertCheck): boolean {
  const { signalType, currentPrice, takeProfit } = check;
  
  if (signalType === "BUY") {
    return currentPrice >= takeProfit;
  } else {
    return currentPrice <= takeProfit;
  }
}

/**
 * Check if a signal has hit its stop loss
 */
function hasStopLossHit(check: AlertCheck): boolean {
  const { signalType, currentPrice, stopLoss } = check;
  
  if (signalType === "BUY") {
    return currentPrice <= stopLoss;
  } else {
    return currentPrice >= stopLoss;
  }
}

/**
 * Check all active signals for alert triggers
 * This function should be called periodically (e.g., every 5 minutes)
 */
export async function checkSignalsForAlerts() {
  console.log("[AlertService] Checking signals for alert triggers...");
  
  try {
    // Get all active signals
    const signals = await getActiveSignals();
    
    if (!signals || signals.length === 0) {
      console.log("[AlertService] No active signals to check");
      return;
    }

    console.log(`[AlertService] Checking ${signals.length} active signals`);

    for (const signal of signals) {
      try {
        // Get P/L performance for this signal
        const performance = await getSignalPerformance(signal.id);
        
        if (!performance || !performance.currentPrice) {
          continue;
        }

        const check: AlertCheck = {
          signalId: signal.id,
          pair: signal.pair,
          signalType: signal.signalType,
          entryPrice: parseFloat(signal.entryPrice),
          stopLoss: parseFloat(signal.stopLoss),
          takeProfit: parseFloat(signal.takeProfit),
          currentPrice: parseFloat(performance.currentPrice),
          plDollars: parseFloat(performance.plDollars || "0"),
          plPercentage: parseFloat(performance.plPercentage || "0"),
        };

        // Check for profit target hit
        if (hasProfitTargetHit(check)) {
          await triggerAlert({
            signalId: signal.id,
            alertType: "profit_target",
            pair: check.pair,
            signalType: check.signalType,
            plDollars: check.plDollars,
            plPercentage: check.plPercentage,
            currentPrice: check.currentPrice,
          });
        }

        // Check for stop loss hit
        if (hasStopLossHit(check)) {
          await triggerAlert({
            signalId: signal.id,
            alertType: "stop_loss",
            pair: check.pair,
            signalType: check.signalType,
            plDollars: check.plDollars,
            plPercentage: check.plPercentage,
            currentPrice: check.currentPrice,
          });
        }

        // Check for percentage gain/loss thresholds
        // This will check user-specific preferences
        await checkPercentageThresholds(check);

      } catch (error) {
        console.error(`[AlertService] Error checking signal ${signal.id}:`, error);
      }
    }

    console.log("[AlertService] Finished checking signals");
  } catch (error) {
    console.error("[AlertService] Error in checkSignalsForAlerts:", error);
  }
}

/**
 * Check if signal has crossed user-defined percentage thresholds
 */
async function checkPercentageThresholds(check: AlertCheck) {
  // For now, we'll implement this in a future iteration
  // This would check each user's alert preferences and trigger alerts
  // based on their custom percentage thresholds
}

/**
 * Trigger an alert for a specific signal
 */
async function triggerAlert(params: {
  signalId: string;
  alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss";
  pair: string;
  signalType: string;
  plDollars: number;
  plPercentage: number;
  currentPrice: number;
}) {
  const { signalId, alertType, pair, signalType, plDollars, plPercentage, currentPrice } = params;

  // Create alert message
  let message = "";
  let emoji = "";
  
  switch (alertType) {
    case "profit_target":
      emoji = "🎯";
      message = `${emoji} Profit Target Hit! ${pair} ${signalType} signal has reached its take profit target. P/L: +$${plDollars.toFixed(2)} (+${plPercentage.toFixed(2)}%) at ${currentPrice}`;
      break;
    case "stop_loss":
      emoji = "⚠️";
      message = `${emoji} Stop Loss Hit! ${pair} ${signalType} signal has hit its stop loss. P/L: $${plDollars.toFixed(2)} (${plPercentage.toFixed(2)}%) at ${currentPrice}`;
      break;
    case "percent_gain":
      emoji = "📈";
      message = `${emoji} Profit Alert! ${pair} ${signalType} signal is up +$${plDollars.toFixed(2)} (+${plPercentage.toFixed(2)}%) at ${currentPrice}`;
      break;
    case "percent_loss":
      emoji = "📉";
      message = `${emoji} Loss Alert! ${pair} ${signalType} signal is down $${plDollars.toFixed(2)} (${plPercentage.toFixed(2)}%) at ${currentPrice}`;
      break;
  }

  console.log(`[AlertService] Triggering alert: ${message}`);

  // Get all users with alert preferences for this alert type
  const { getUserAlertPreferences, getUser } = await import("./db");
  const { sendPushNotification } = await import("./pushNotificationService");
  
  try {
    // Notify the owner (admin)
    await notifyOwner({
      title: `Signal Alert: ${pair} ${signalType}`,
      content: message,
    });

    // In production, get all users with this signal and their alert preferences
    // For now, we'll send to all users with this alert type enabled
    // This is a simplified implementation - in production you'd filter by watchlist
    
    // Get all users (in production, filter by those who have this signal)
    const db = await import("./db").then(m => m.getDb());
    if (db) {
      const { users: usersTable } = await import("../drizzle/schema");
      const allUsers = await db.select().from(usersTable);
      
      for (const user of allUsers) {
        if (!user.id) continue;
        // Get user's alert preferences
        const prefs = await getUserAlertPreferences(user.id);
        const pref = prefs.find(p => p.alertType === alertType && p.isEnabled);
        
        if (pref) {
          // Send email if channel includes email
          if (pref.channel === "email" || pref.channel === "both") {
            if (user.email) {
              await sendAlertEmail({
                email: user.email,
                name: user.name || "Trader",
                pair,
                signalType,
                alertType,
                plDollars,
                plPercentage,
                currentPrice,
              });
            }
          }
          
          // Send push notification if channel includes browser
          if (pref.channel === "browser" || pref.channel === "both") {
            await sendPushNotification(user.id, {
              title: `${emoji} ${alertType === "profit_target" ? "Profit Target Hit" : alertType === "stop_loss" ? "Stop Loss Hit" : alertType === "percent_gain" ? "Profit Alert" : "Loss Alert"}`,
              body: `${pair} ${signalType}: ${plDollars >= 0 ? "+" : ""}$${plDollars.toFixed(2)} (${plPercentage >= 0 ? "+" : ""}${plPercentage.toFixed(2)}%)`,
              tag: `signal-${signalId}-${alertType}`,
              requireInteraction: true,
              url: "/",
              signalId,
              alertType,
            });
          }
          
          // Log the alert
          await logAlert({
            userId: user.id,
            signalId,
            alertType,
            channel: pref.channel,
            message,
            plDollars: plDollars.toFixed(2),
            plPercentage: plPercentage.toFixed(2),
          });
        }
      }
    }

  } catch (error) {
    console.error("[AlertService] Error sending alert:", error);
  }
}

/**
 * Send browser notification to a user
 * This would be called from the frontend using the Web Notifications API
 */
export function createBrowserNotification(title: string, body: string, icon?: string) {
  return {
    title,
    body,
    icon: icon || "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    tag: "forex-signal-alert",
    requireInteraction: true,
  };
}

/**
 * Send email alert to a user
 */
export async function sendAlertEmail(params: {
  email: string;
  name: string;
  pair: string;
  signalType: string;
  alertType: string;
  plDollars: number;
  plPercentage: number;
  currentPrice: number;
}) {
  const { email, name, pair, signalType, alertType, plDollars, plPercentage, currentPrice } = params;

  let subject = "";
  let emoji = "";
  
  switch (alertType) {
    case "profit_target":
      emoji = "🎯";
      subject = `Profit Target Hit: ${pair} ${signalType}`;
      break;
    case "stop_loss":
      emoji = "⚠️";
      subject = `Stop Loss Hit: ${pair} ${signalType}`;
      break;
    case "percent_gain":
      emoji = "📈";
      subject = `Profit Alert: ${pair} ${signalType}`;
      break;
    case "percent_loss":
      emoji = "📉";
      subject = `Loss Alert: ${pair} ${signalType}`;
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">${emoji} FOX TRADE MASTER™</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Signal Alert Notification</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #FF6B35; margin-top: 0;">${subject}</h2>
        
        <p>Hi ${name},</p>
        
        <p>Your ${pair} ${signalType} signal has triggered an alert:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${plDollars >= 0 ? '#10b981' : '#ef4444'};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Currency Pair:</td>
              <td style="padding: 8px 0;">${pair}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Signal Type:</td>
              <td style="padding: 8px 0;">${signalType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Current Price:</td>
              <td style="padding: 8px 0;">${currentPrice.toFixed(4)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">P/L:</td>
              <td style="padding: 8px 0; color: ${plDollars >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                ${plDollars >= 0 ? '+' : ''}$${plDollars.toFixed(2)} (${plDollars >= 0 ? '+' : ''}${plPercentage.toFixed(2)}%)
              </td>
            </tr>
          </table>
        </div>
        
        <p style="margin-top: 20px;">
          <a href="https://forex-signals-pro.onrender.com" style="display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          <strong>Disclaimer:</strong> This is an automated alert based on your notification preferences. Past performance is not indicative of future results. Always conduct your own research before making trading decisions.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>© 2025 FOX TRADE MASTER™. All rights reserved.</p>
        <p>You're receiving this email because you enabled alerts for your trading signals.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const msg = {
      to: email,
      from: ENV.fromEmail || 'noreply@foxtrademaster.com',
      subject,
      html,
    };
    
    await sgMail.send(msg);
    console.log(`[AlertService] Alert email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[AlertService] Failed to send alert email:", error);
    return false;
  }
}
