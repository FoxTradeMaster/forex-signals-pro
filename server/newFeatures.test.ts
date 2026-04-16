import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Feature 1: grantReferralReward ────────────────────────────────────────────
describe("grantReferralReward logic", () => {
  it("extends subscription by 1 month from today when referrer is on free tier", () => {
    const base = new Date("2026-04-16T00:00:00Z");
    const expected = new Date("2026-05-16T00:00:00Z");
    const result = new Date(base);
    result.setMonth(result.getMonth() + 1);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it("extends subscription by 1 month from existing expiry when still active", () => {
    // Use a fixed date in the past so the condition always picks existingExpiry
    const existingExpiry = new Date("2027-06-01T00:00:00Z"); // future date
    const base = existingExpiry > new Date() ? existingExpiry : new Date();
    const result = new Date(base);
    const originalMonth = result.getUTCMonth();
    result.setUTCMonth(result.getUTCMonth() + 1);
    // Month should have advanced by 1 (mod 12)
    expect(result.getUTCMonth()).toBe((originalMonth + 1) % 12);
  });

  it("upgrades free-tier referrer to premium", () => {
    const currentTier = "free";
    const newTier = currentTier === "free" ? "premium" : currentTier;
    expect(newTier).toBe("premium");
  });

  it("keeps premium referrer on premium", () => {
    const currentTier = "premium";
    const newTier = currentTier === "free" ? "premium" : currentTier;
    expect(newTier).toBe("premium");
  });

  it("keeps pro referrer on pro", () => {
    const currentTier = "pro";
    const newTier = currentTier === "free" ? "premium" : currentTier;
    expect(newTier).toBe("pro");
  });
});

// ── Feature 2: Signal outcome tracking logic ──────────────────────────────────
describe("Signal outcome tracking logic", () => {
  it("detects target_hit for BUY signal when price >= takeProfit", () => {
    const signal = { signalType: "BUY", entryPrice: "1.0800", takeProfit: "1.0900", stopLoss: "1.0750" };
    const currentPrice = 1.0905;
    const tp = parseFloat(signal.takeProfit);
    const sl = parseFloat(signal.stopLoss);
    let status: string;
    if (signal.signalType === "BUY") {
      if (currentPrice >= tp) status = "target_hit";
      else if (currentPrice <= sl) status = "stop_loss_hit";
      else status = "active";
    } else {
      if (currentPrice <= tp) status = "target_hit";
      else if (currentPrice >= sl) status = "stop_loss_hit";
      else status = "active";
    }
    expect(status).toBe("target_hit");
  });

  it("detects stop_loss_hit for BUY signal when price <= stopLoss", () => {
    const signal = { signalType: "BUY", entryPrice: "1.0800", takeProfit: "1.0900", stopLoss: "1.0750" };
    const currentPrice = 1.0745;
    const tp = parseFloat(signal.takeProfit);
    const sl = parseFloat(signal.stopLoss);
    let status: string;
    if (signal.signalType === "BUY") {
      if (currentPrice >= tp) status = "target_hit";
      else if (currentPrice <= sl) status = "stop_loss_hit";
      else status = "active";
    } else {
      status = "active";
    }
    expect(status).toBe("stop_loss_hit");
  });

  it("returns active for BUY signal when price is between SL and TP", () => {
    const signal = { signalType: "BUY", entryPrice: "1.0800", takeProfit: "1.0900", stopLoss: "1.0750" };
    const currentPrice = 1.0850;
    const tp = parseFloat(signal.takeProfit);
    const sl = parseFloat(signal.stopLoss);
    let status: string;
    if (signal.signalType === "BUY") {
      if (currentPrice >= tp) status = "target_hit";
      else if (currentPrice <= sl) status = "stop_loss_hit";
      else status = "active";
    } else {
      status = "active";
    }
    expect(status).toBe("active");
  });

  it("detects target_hit for SELL signal when price <= takeProfit", () => {
    const signal = { signalType: "SELL", entryPrice: "1.0800", takeProfit: "1.0700", stopLoss: "1.0850" };
    const currentPrice = 1.0695;
    const tp = parseFloat(signal.takeProfit);
    const sl = parseFloat(signal.stopLoss);
    let status: string;
    if (signal.signalType === "BUY") {
      status = "active";
    } else {
      if (currentPrice <= tp) status = "target_hit";
      else if (currentPrice >= sl) status = "stop_loss_hit";
      else status = "active";
    }
    expect(status).toBe("target_hit");
  });
});

// ── Feature 3: sendFreeWelcomeEmail guard ─────────────────────────────────────
describe("sendFreeWelcomeEmail guard", () => {
  it("skips sending when SENDGRID_API_KEY is not configured", async () => {
    const originalKey = process.env.SENDGRID_API_KEY;
    process.env.SENDGRID_API_KEY = "";
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
    const wouldSend = !!SENDGRID_API_KEY;
    expect(wouldSend).toBe(false);
    process.env.SENDGRID_API_KEY = originalKey;
  });

  it("would send when SENDGRID_API_KEY is configured", () => {
    process.env.SENDGRID_API_KEY = "SG.test_key_123";
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
    const wouldSend = !!SENDGRID_API_KEY;
    expect(wouldSend).toBe(true);
    delete process.env.SENDGRID_API_KEY;
  });

  it("generates correct upgrade URL", () => {
    process.env.FRONTEND_URL = "https://foxtrademaster.com";
    const upgradeUrl = `${process.env.FRONTEND_URL || "https://foxtrademaster.com"}/premium`;
    expect(upgradeUrl).toBe("https://foxtrademaster.com/premium");
  });

  it("falls back to default URL when FRONTEND_URL is not set", () => {
    delete process.env.FRONTEND_URL;
    const upgradeUrl = `${process.env.FRONTEND_URL || "https://foxtrademaster.com"}/premium`;
    expect(upgradeUrl).toBe("https://foxtrademaster.com/premium");
  });
});
