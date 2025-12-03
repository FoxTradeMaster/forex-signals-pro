import { ENV } from "./env";

/**
 * Send magic link email via SendGrid
 * @param email Recipient email address
 * @param token Magic link token
 * @param tier Subscription tier (premium or pro)
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  tier: "premium" | "pro"
): Promise<boolean> {
  if (!ENV.sendgridApiKey || !ENV.fromEmail) {
    console.warn("[SendGrid] API key or from email not configured");
    return false;
  }

  const magicLinkUrl = `${ENV.frontendUrl || "https://forex-signals-pro.onrender.com"}/auth/verify?token=${token}`;
  
  const tierName = tier === "premium" ? "Premium" : "Pro";
  const tierFeatures = tier === "premium" 
    ? "10 currency pairs" 
    : "156 currency pairs";

  const emailData = {
    personalizations: [
      {
        to: [{ email }],
        subject: `Welcome to FOX TRADE MASTER™ ${tierName}!`,
      },
    ],
    from: {
      email: ENV.fromEmail,
      name: "FOX TRADE MASTER™",
    },
    content: [
      {
        type: "text/html",
        value: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .feature-item:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🦊 FOX TRADE MASTER™</h1>
      <h2>Welcome to ${tierName}!</h2>
    </div>
    <div class="content">
      <p>Thank you for subscribing to FOX TRADE MASTER™ ${tierName}!</p>
      
      <p>Click the button below to activate your account and start receiving advanced forex trading signals:</p>
      
      <div style="text-align: center;">
        <a href="${magicLinkUrl}" class="button">Activate My Account</a>
      </div>
      
      <div class="features">
        <h3>Your ${tierName} Benefits:</h3>
        <div class="feature-item">✅ ${tierFeatures}</div>
        <div class="feature-item">✅ Full signal details with entry/exit points</div>
        <div class="feature-item">✅ 4 trading strategies (Swing, Day, Trend, Scalping)</div>
        <div class="feature-item">✅ Real-time alerts</div>
        <div class="feature-item">✅ 24-hour momentum analysis</div>
        <div class="feature-item">✅ Session-based trading windows</div>
      </div>
      
      <p><strong>Note:</strong> This link will expire in 24 hours for security reasons.</p>
      
      <p>If you didn't request this email, please ignore it.</p>
      
      <p>Happy Trading!<br>The FOX TRADE MASTER™ Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} FOX TRADE MASTER™. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
        `,
      },
    ],
  };

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SendGrid] Failed to send email:");
      console.error("[SendGrid] Status:", response.status);
      console.error("[SendGrid] Response:", errorText);
      console.error("[SendGrid] API Key present:", !!ENV.sendgridApiKey);
      console.error("[SendGrid] From email:", ENV.fromEmail);
      return false;
    }

    console.log("[SendGrid] Magic link email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("[SendGrid] Error sending email:", error);
    return false;
  }
}
