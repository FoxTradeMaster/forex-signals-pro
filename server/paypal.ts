// @ts-ignore - No types available for this package
import paypal from "@paypal/checkout-server-sdk";

// PayPal credentials from environment
const PAYPAL_CLIENT_ID = "AZUPU21PGTWxSvemHCa8Obai4PjqLq_JeCljq8bo3YljBClOgau2jwbndlZaGeqJNWctkrhWSiLMSLQS";
const PAYPAL_SECRET_KEY = "EIgGWc8sM2odSjDtKcFWrhAffyMTzYGh7tGn5sCIYOiKHL2CNV2dchVyh_v1NuhXgIRZGuvY38agRpTg";
const PAYPAL_MODE = "live"; // 'sandbox' or 'live'

// Configure PayPal environment
function environment() {
  if (PAYPAL_MODE === "live") {
    return new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY);
  }
  return new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY);
}

// Create PayPal client
function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

/**
 * Create a PayPal order for subscription payment
 */
export async function createPayPalOrder(plan: "monthly" | "yearly") {
  const amount = plan === "monthly" ? "99.95" : "1000.00";
  const description = plan === "monthly" 
    ? "FOX TRADE MASTER - Monthly Premium Subscription"
    : "FOX TRADE MASTER - Yearly Premium Subscription (Save $199)";

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: amount,
        },
        description,
      },
    ],
    application_context: {
      brand_name: "FOX TRADE MASTER",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/premium/success`,
      cancel_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/premium`,
    },
  });

  try {
    const response = await client().execute(request);
    return {
      success: true,
      orderId: response.result.id,
      approvalUrl: response.result.links?.find((link: any) => link.rel === "approve")?.href,
    };
  } catch (error: any) {
    console.error("PayPal order creation error:", error);
    return {
      success: false,
      error: error.message || "Failed to create PayPal order",
    };
  }
}

/**
 * Capture a PayPal order after user approval
 */
export async function capturePayPalOrder(orderId: string) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client().execute(request);
    const captureStatus = response.result.status;

    if (captureStatus === "COMPLETED") {
      return {
        success: true,
        orderId: response.result.id,
        payerId: response.result.payer?.payer_id,
        amount: response.result.purchase_units[0].amount.value,
        currency: response.result.purchase_units[0].amount.currency_code,
      };
    }

    return {
      success: false,
      error: `Payment not completed. Status: ${captureStatus}`,
    };
  } catch (error: any) {
    console.error("PayPal order capture error:", error);
    return {
      success: false,
      error: error.message || "Failed to capture PayPal order",
    };
  }
}

/**
 * Verify a PayPal order status
 */
export async function verifyPayPalOrder(orderId: string) {
  const request = new paypal.orders.OrdersGetRequest(orderId);

  try {
    const response = await client().execute(request);
    return {
      success: true,
      status: response.result.status,
      order: response.result,
    };
  } catch (error: any) {
    console.error("PayPal order verification error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify PayPal order",
    };
  }
}

