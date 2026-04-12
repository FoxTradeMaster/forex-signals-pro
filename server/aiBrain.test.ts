/**
 * Tests for AI Brain service functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock the LLM
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            shouldGenerate: true,
            signalType: "BUY",
            strategy: "swing",
            confidence: 78,
            reasoning: "RSI is oversold at 28, MACD is crossing bullish, price is near lower Bollinger Band support.",
            keyFactors: ["RSI oversold", "MACD bullish crossover", "BB support"],
            riskAssessment: "Medium risk - clear support level identified",
            strength: 7,
            timeframe: "1h",
            stopLossMultiplier: 2.0,
            takeProfitMultiplier: 3.0,
            aiInsight: "Strong confluence of indicators at key support level.",
          }),
        },
      },
    ],
  }),
}));

// Mock polygonService
vi.mock("../server/polygonService", () => ({
  getForexPrice: vi.fn().mockResolvedValue(1.08523),
}));

describe("AI Brain - analyzeWithAI", () => {
  it("should return a valid signal decision from LLM", async () => {
    const { analyzeWithAI } = await import("../server/aiBrain");
    
    const snapshot = {
      pair: "EUR/USD",
      currentPrice: 1.08523,
      rsi: 28.5,
      macd: -0.00012,
      macdSignal: -0.00008,
      macdHistogram: -0.00004,
      sma50: 1.09012,
      bbUpper: 1.09500,
      bbMiddle: 1.08800,
      bbLower: 1.08100,
      atr: 0.00085,
      high24h: 1.09200,
      low24h: 1.08100,
      priceChange24h: -0.00350,
    };

    const weights = {
      macdWeight: "1.0",
      rsiWeight: "1.2",
      bbWeight: "1.1",
      smaWeight: "0.9",
      atrWeight: "1.0",
      winRate: "65",
      totalSignals: "20",
      confidenceScore: "72",
    };

    const recentHistory = [
      { outcome: "target_hit", plPips: "25.5", strategy: "swing" },
      { outcome: "target_hit", plPips: "18.2", strategy: "swing" },
      { outcome: "stop_loss_hit", plPips: "-15.0", strategy: "swing" },
    ];

    const decision = await analyzeWithAI(snapshot, weights, recentHistory);

    expect(decision).toBeDefined();
    expect(decision.shouldGenerate).toBe(true);
    expect(decision.signalType).toBe("BUY");
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.confidence).toBeLessThanOrEqual(100);
    expect(decision.reasoning).toBeTruthy();
    expect(Array.isArray(decision.keyFactors)).toBe(true);
    expect(decision.entryPrice).toBe(1.08523);
    expect(decision.stopLoss).toBeLessThan(decision.entryPrice); // BUY: SL below entry
    expect(decision.takeProfit).toBeGreaterThan(decision.entryPrice); // BUY: TP above entry
    expect(decision.strength).toBeGreaterThanOrEqual(1);
    expect(decision.strength).toBeLessThanOrEqual(10);
  });

  it("should return HOLD decision when LLM says shouldGenerate is false", async () => {
    const { invokeLLM } = await import("../server/_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              shouldGenerate: false,
              signalType: "HOLD",
              strategy: "swing",
              confidence: 30,
              reasoning: "Mixed signals, no clear direction.",
              keyFactors: [],
              riskAssessment: "High risk - unclear market conditions",
              strength: 3,
              timeframe: "1h",
            }),
          },
        },
      ],
    });

    const { analyzeWithAI } = await import("../server/aiBrain");

    const snapshot = {
      pair: "GBP/USD",
      currentPrice: 1.27500,
      rsi: 52.0,
      macd: 0.00001,
      macdSignal: 0.00002,
      macdHistogram: -0.00001,
      sma50: 1.27450,
      bbUpper: 1.28000,
      bbMiddle: 1.27500,
      bbLower: 1.27000,
      atr: 0.00070,
      high24h: 1.27800,
      low24h: 1.27200,
      priceChange24h: 0.00050,
    };

    const weights = {
      macdWeight: "1.0",
      rsiWeight: "1.0",
      bbWeight: "1.0",
      smaWeight: "1.0",
      atrWeight: "1.0",
      winRate: "50",
      totalSignals: "10",
      confidenceScore: "50",
    };

    const decision = await analyzeWithAI(snapshot, weights, []);
    expect(decision.shouldGenerate).toBe(false);
    expect(decision.signalType).toBe("HOLD");
  });

  it("should handle LLM failure gracefully with fallback", async () => {
    const { invokeLLM } = await import("../server/_core/llm");
    (invokeLLM as any).mockRejectedValueOnce(new Error("LLM unavailable"));

    const { analyzeWithAI } = await import("../server/aiBrain");

    const snapshot = {
      pair: "USD/JPY",
      currentPrice: 149.500,
      rsi: 65.0,
      macd: 0.050,
      macdSignal: 0.040,
      macdHistogram: 0.010,
      sma50: 148.800,
      bbUpper: 150.200,
      bbMiddle: 149.200,
      bbLower: 148.200,
      atr: 0.350,
      high24h: 149.800,
      low24h: 148.900,
      priceChange24h: 0.300,
    };

    const weights = {
      macdWeight: "1.0",
      rsiWeight: "1.0",
      bbWeight: "1.0",
      smaWeight: "1.0",
      atrWeight: "1.0",
      winRate: "0",
      totalSignals: "0",
      confidenceScore: "50",
    };

    const decision = await analyzeWithAI(snapshot, weights, []);
    expect(decision).toBeDefined();
    expect(decision.shouldGenerate).toBe(false);
    expect(decision.confidence).toBe(0);
    expect(decision.reasoning).toContain("unavailable");
  });
});

describe("AI Brain - getDefaultWeights", () => {
  it("should return default weights when no DB data exists", async () => {
    const { getStrategyWeights } = await import("../server/aiBrain");
    const weights = await getStrategyWeights("EUR/USD", "swing", "1h");
    
    expect(weights).toBeDefined();
    expect(weights.macdWeight).toBe("1.0");
    expect(weights.rsiWeight).toBe("1.0");
    expect(weights.confidenceScore).toBe("50");
  });
});

describe("AI Brain - signal price calculations", () => {
  it("should calculate correct stop loss and take profit for BUY signal", async () => {
    const { invokeLLM } = await import("../server/_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              shouldGenerate: true,
              signalType: "BUY",
              strategy: "trend",
              confidence: 82,
              reasoning: "Strong uptrend with momentum.",
              keyFactors: ["Uptrend", "MACD bullish"],
              riskAssessment: "Low risk",
              strength: 8,
              timeframe: "4h",
              stopLossMultiplier: 2.0,
              takeProfitMultiplier: 3.0,
              aiInsight: "Strong momentum setup.",
            }),
          },
        },
      ],
    });

    const { analyzeWithAI } = await import("../server/aiBrain");

    const snapshot = {
      pair: "EUR/USD",
      currentPrice: 1.09000,
      rsi: 60.0,
      macd: 0.00025,
      macdSignal: 0.00015,
      macdHistogram: 0.00010,
      sma50: 1.08500,
      bbUpper: 1.09500,
      bbMiddle: 1.09000,
      bbLower: 1.08500,
      atr: 0.00100, // 1 pip = 0.0001, ATR = 10 pips
      high24h: 1.09200,
      low24h: 1.08700,
      priceChange24h: 0.00200,
    };

    const weights = {
      macdWeight: "1.2",
      rsiWeight: "1.0",
      bbWeight: "1.0",
      smaWeight: "1.1",
      atrWeight: "1.0",
      winRate: "70",
      totalSignals: "50",
      confidenceScore: "80",
    };

    const decision = await analyzeWithAI(snapshot, weights, []);

    // For BUY: SL = entry - (ATR * slMultiplier), TP = entry + (ATR * tpMultiplier)
    // ATR = 0.001, slMultiplier = 2.0, tpMultiplier = 3.0
    // SL = 1.09000 - (0.001 * 2.0) = 1.08800
    // TP = 1.09000 + (0.001 * 3.0) = 1.09300
    expect(decision.stopLoss).toBeCloseTo(1.08800, 4);
    expect(decision.takeProfit).toBeCloseTo(1.09300, 4);
    expect(decision.entryPrice).toBe(1.09000);
  });
});
