/**
 * Trading Signal Generation Engine
 * Implements three strategies: Swing Trading, Day Trading, and Trend Following
 */

import { OHLCData, ForexPairData } from "./forexData";
import { MomentumWindowAnalyzer, MomentumWindow } from "./momentumWindow";

export interface TradingSignal {
  id: string;
  pair: string;
  signalType: "BUY" | "SELL" | "HOLD";
  strength: number; // 1-10
  strategy: "swing" | "day" | "trend" | "momentum";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  reason: string;
  indicators: Record<string, number>;
  timestamp: Date;
  isActive: boolean;
  momentumWindow?: MomentumWindow;
}

/**
 * Technical Indicators Calculator
 */
class TechnicalIndicators {
  /**
   * Exponential Moving Average
   */
  static ema(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(data[0]);
      } else {
        ema = (data[i] - ema) * multiplier + ema;
        result.push(ema);
      }
    }

    return result;
  }

  /**
   * Simple Moving Average
   */
  static sma(data: number[], period: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }

    return result;
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   */
  static macd(
    close: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
  ): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
    const emaFast = this.ema(close, fastPeriod);
    const emaSlow = this.ema(close, slowPeriod);
    const macdLine = emaFast.map((val, i) => val - emaSlow[i]);
    const signalLine = this.ema(macdLine, signalPeriod);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);

    return { macdLine, signalLine, histogram };
  }

  /**
   * Relative Strength Index
   */
  static rsi(close: number[], period = 14): number[] {
    const result: number[] = [];
    const changes: number[] = [];

    for (let i = 1; i < close.length; i++) {
      changes.push(close[i] - close[i - 1]);
    }

    for (let i = 0; i < close.length; i++) {
      if (i < period) {
        result.push(NaN);
      } else {
        const recentChanges = changes.slice(i - period, i);
        const gains = recentChanges.filter(c => c > 0);
        const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

        if (avgLoss === 0) {
          result.push(100);
        } else {
          const rs = avgGain / avgLoss;
          const rsi = 100 - 100 / (1 + rs);
          result.push(rsi);
        }
      }
    }

    return result;
  }

  /**
   * Bollinger Bands
   */
  static bollingerBands(
    close: number[],
    period = 20,
    stdDev = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.sma(close, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < close.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = close.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);

        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Average True Range (for volatility)
   */
  static atr(high: number[], low: number[], close: number[], period = 14): number[] {
    const trueRanges: number[] = [];

    for (let i = 1; i < high.length; i++) {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );
      trueRanges.push(tr);
    }

    const result: number[] = [NaN];
    for (let i = 0; i < trueRanges.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const atr = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        result.push(atr);
      }
    }

    return result;
  }
}

/**
 * Swing Trading Strategy (MACD + SMA)
 */
class SwingTradingStrategy {
  analyze(pairData: ForexPairData): TradingSignal | null {
    const { pair, currentPrice, ohlc } = pairData;
    const { close, high, low } = ohlc;

    if (close.length < 60) return null;

    // Calculate indicators
    const { macdLine, signalLine, histogram } = TechnicalIndicators.macd(close);
    const sma50 = TechnicalIndicators.sma(close, 50);
    const atr = TechnicalIndicators.atr(high, low, close);

    const idx = close.length - 1;
    const currentMacd = macdLine[idx];
    const currentSignal = signalLine[idx];
    const currentHist = histogram[idx];
    const prevHist = histogram[idx - 1];
    const currentSma = sma50[idx];
    const currentAtr = atr[idx];

    if (isNaN(currentMacd) || isNaN(currentSma) || isNaN(currentAtr)) return null;

    // Detect crossover
    const bullishCrossover = prevHist < 0 && currentHist > 0;
    const bearishCrossover = prevHist > 0 && currentHist < 0;

    // Pre-signal detection
    const approachingBullish = currentHist < 0 && currentMacd > currentSignal * 0.9;
    const approachingBearish = currentHist > 0 && currentMacd < currentSignal * 1.1;

    // Trend confirmation
    const uptrend = currentPrice > currentSma;
    const downtrend = currentPrice < currentSma;

    let signalType: "BUY" | "SELL" | "HOLD" = "HOLD";
    let strength = 0;
    let reason = "";

    if (bullishCrossover && uptrend) {
      signalType = "BUY";
      strength = 9;
      reason = "MACD bullish crossover confirmed, price above 50 SMA (strong uptrend)";
    } else if (approachingBullish && uptrend) {
      signalType = "BUY";
      strength = 7;
      reason = "MACD approaching bullish crossover, price above 50 SMA (prepare to buy)";
    } else if (bullishCrossover) {
      signalType = "BUY";
      strength = 6;
      reason = "MACD bullish crossover detected (moderate signal)";
    } else if (bearishCrossover && downtrend) {
      signalType = "SELL";
      strength = 9;
      reason = "MACD bearish crossover confirmed, price below 50 SMA (strong downtrend)";
    } else if (approachingBearish && downtrend) {
      signalType = "SELL";
      strength = 7;
      reason = "MACD approaching bearish crossover, price below 50 SMA (prepare to sell)";
    } else if (bearishCrossover) {
      signalType = "SELL";
      strength = 6;
      reason = "MACD bearish crossover detected (moderate signal)";
    } else if (currentHist > 0 && uptrend) {
      signalType = "BUY";
      strength = 5;
      reason = "MACD positive momentum, price above 50 SMA (bullish bias)";
    } else if (currentHist < 0 && downtrend) {
      signalType = "SELL";
      strength = 5;
      reason = "MACD negative momentum, price below 50 SMA (bearish bias)";
    }

    if (signalType === "HOLD") return null;

    // Calculate stop loss and take profit
    const stopLoss = signalType === "BUY" 
      ? currentPrice - 2 * currentAtr 
      : currentPrice + 2 * currentAtr;
    const takeProfit = signalType === "BUY" 
      ? currentPrice + 3 * currentAtr 
      : currentPrice - 3 * currentAtr;

    return {
      id: `${pair}-swing-${Date.now()}`,
      pair,
      signalType,
      strength,
      strategy: "swing",
      entryPrice: parseFloat(currentPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timeframe: "1h",
      reason,
      indicators: {
        macd: parseFloat(currentMacd.toFixed(5)),
        signal: parseFloat(currentSignal.toFixed(5)),
        histogram: parseFloat(currentHist.toFixed(5)),
        sma50: parseFloat(currentSma.toFixed(5)),
        price: parseFloat(currentPrice.toFixed(5)),
      },
      timestamp: new Date(),
      isActive: true,
    };
  }
}

/**
 * Day Trading Strategy (RSI + Bollinger Bands)
 */
class DayTradingStrategy {
  analyze(pairData: ForexPairData): TradingSignal | null {
    const { pair, currentPrice, ohlc } = pairData;
    const { close } = ohlc;

    if (close.length < 30) return null;

    // Calculate indicators
    const rsi = TechnicalIndicators.rsi(close, 14);
    const bb = TechnicalIndicators.bollingerBands(close, 20);

    const idx = close.length - 1;
    const currentRsi = rsi[idx];
    const bbUpper = bb.upper[idx];
    const bbMiddle = bb.middle[idx];
    const bbLower = bb.lower[idx];

    if (isNaN(currentRsi) || isNaN(bbUpper)) return null;

    let signalType: "BUY" | "SELL" | "HOLD" = "HOLD";
    let strength = 0;
    let reason = "";

    // Oversold + at lower band
    if (currentRsi < 30 && currentPrice <= bbLower * 1.01) {
      signalType = "BUY";
      strength = 9;
      reason = `RSI oversold (${currentRsi.toFixed(1)}), price at lower Bollinger Band (strong reversal signal)`;
    } else if (currentRsi < 35 && currentPrice < bbMiddle) {
      signalType = "BUY";
      strength = 6;
      reason = `RSI approaching oversold (${currentRsi.toFixed(1)}), price below middle band (potential reversal)`;
    }
    // Overbought + at upper band
    else if (currentRsi > 70 && currentPrice >= bbUpper * 0.99) {
      signalType = "SELL";
      strength = 9;
      reason = `RSI overbought (${currentRsi.toFixed(1)}), price at upper Bollinger Band (strong reversal signal)`;
    } else if (currentRsi > 65 && currentPrice > bbMiddle) {
      signalType = "SELL";
      strength = 6;
      reason = `RSI approaching overbought (${currentRsi.toFixed(1)}), price above middle band (potential reversal)`;
    }

    if (signalType === "HOLD") return null;

    const bbWidth = bbUpper - bbLower;
    const stopLoss = signalType === "BUY" 
      ? currentPrice - bbWidth * 0.3 
      : currentPrice + bbWidth * 0.3;
    const takeProfit = bbMiddle;

    return {
      id: `${pair}-day-${Date.now()}`,
      pair,
      signalType,
      strength,
      strategy: "day",
      entryPrice: parseFloat(currentPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timeframe: "15m",
      reason,
      indicators: {
        rsi: parseFloat(currentRsi.toFixed(2)),
        bbUpper: parseFloat(bbUpper.toFixed(5)),
        bbMiddle: parseFloat(bbMiddle.toFixed(5)),
        bbLower: parseFloat(bbLower.toFixed(5)),
        price: parseFloat(currentPrice.toFixed(5)),
      },
      timestamp: new Date(),
      isActive: true,
    };
  }
}

/**
 * Trend Following Strategy (Multiple EMAs)
 */
class TrendFollowingStrategy {
  analyze(pairData: ForexPairData): TradingSignal | null {
    const { pair, currentPrice, ohlc } = pairData;
    const { close, high, low } = ohlc;

    if (close.length < 60) return null;

    // Calculate indicators
    const ema9 = TechnicalIndicators.ema(close, 9);
    const ema21 = TechnicalIndicators.ema(close, 21);
    const ema50 = TechnicalIndicators.ema(close, 50);
    const atr = TechnicalIndicators.atr(high, low, close);

    const idx = close.length - 1;
    const currentEma9 = ema9[idx];
    const currentEma21 = ema21[idx];
    const currentEma50 = ema50[idx];
    const currentAtr = atr[idx];

    if (isNaN(currentEma9) || isNaN(currentEma21) || isNaN(currentEma50) || isNaN(currentAtr)) {
      return null;
    }

    // Check EMA alignment
    const bullishAlignment = currentEma9 > currentEma21 && currentEma21 > currentEma50;
    const bearishAlignment = currentEma9 < currentEma21 && currentEma21 < currentEma50;

    // Approaching alignment
    const approachingBullish = 
      currentEma9 > currentEma21 && 
      currentEma21 < currentEma50 && 
      currentEma21 > currentEma50 * 0.995;
    const approachingBearish = 
      currentEma9 < currentEma21 && 
      currentEma21 > currentEma50 && 
      currentEma21 < currentEma50 * 1.005;

    let signalType: "BUY" | "SELL" | "HOLD" = "HOLD";
    let strength = 0;
    let reason = "";

    if (bullishAlignment) {
      signalType = "BUY";
      strength = 10;
      reason = "Strong uptrend: All EMAs aligned bullish (ride the trend)";
    } else if (approachingBullish) {
      signalType = "BUY";
      strength = 6;
      reason = "Emerging uptrend: EMAs approaching bullish alignment (early entry)";
    } else if (bearishAlignment) {
      signalType = "SELL";
      strength = 10;
      reason = "Strong downtrend: All EMAs aligned bearish (ride the trend)";
    } else if (approachingBearish) {
      signalType = "SELL";
      strength = 6;
      reason = "Emerging downtrend: EMAs approaching bearish alignment (early entry)";
    }

    if (signalType === "HOLD") return null;

    const stopLoss = currentEma21;
    const takeProfit = signalType === "BUY" 
      ? currentPrice + 4 * currentAtr 
      : currentPrice - 4 * currentAtr;

    return {
      id: `${pair}-trend-${Date.now()}`,
      pair,
      signalType,
      strength,
      strategy: "trend",
      entryPrice: parseFloat(currentPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timeframe: "1h",
      reason,
      indicators: {
        ema9: parseFloat(currentEma9.toFixed(5)),
        ema21: parseFloat(currentEma21.toFixed(5)),
        ema50: parseFloat(currentEma50.toFixed(5)),
        price: parseFloat(currentPrice.toFixed(5)),
      },
      timestamp: new Date(),
      isActive: true,
    };
  }
}

/**
 * 24-Hour Momentum Strategy (Jeffrey Turnmire style)
 */
class MomentumWindowStrategy {
  private analyzer = new MomentumWindowAnalyzer();

  analyze(pairData: ForexPairData): TradingSignal | null {
    const { pair, currentPrice, ohlc } = pairData;

    // Analyze 24-hour momentum windows
    const windows = this.analyzer.analyze24HourMomentum(ohlc, pair);
    const bestWindow = this.analyzer.getBestCurrentWindow(windows);

    if (!bestWindow || !bestWindow.isActive) return null;

    // Only generate signal if momentum is strong (6+)
    if (bestWindow.strength < 6) return null;

    // Check if timing is optimal for this pair
    const timingCheck = this.analyzer.isOptimalTradingTime(pair);
    if (!timingCheck.optimal) return null;

    const signalType = bestWindow.direction === "BULLISH" ? "BUY" : bestWindow.direction === "BEARISH" ? "SELL" : "HOLD";
    
    if (signalType === "HOLD") return null;

    // Calculate stop loss and take profit based on volatility
    const volatilityRange = currentPrice * (bestWindow.volatility / 100);
    const stopLoss = signalType === "BUY" 
      ? currentPrice - volatilityRange * 1.5
      : currentPrice + volatilityRange * 1.5;
    const takeProfit = signalType === "BUY" 
      ? currentPrice + volatilityRange * 2.5
      : currentPrice - volatilityRange * 2.5;

    const reason = `${bestWindow.sessionName}: ${bestWindow.recommendation} | Volatility: ${bestWindow.volatility}% | Price Change: ${bestWindow.priceChange > 0 ? '+' : ''}${bestWindow.priceChange}%`;

    return {
      id: `${pair}-momentum-${Date.now()}`,
      pair,
      signalType,
      strength: bestWindow.strength,
      strategy: "momentum",
      entryPrice: parseFloat(currentPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timeframe: "24h",
      reason,
      indicators: {
        volatility: bestWindow.volatility,
        priceChange: bestWindow.priceChange,
        volume: bestWindow.volume,
        sessionStrength: bestWindow.strength,
      },
      timestamp: new Date(),
      isActive: true,
      momentumWindow: bestWindow,
    };
  }
}

/**
 * Main Signal Engine
 */
export class SignalEngine {
  private swingStrategy = new SwingTradingStrategy();
  private dayStrategy = new DayTradingStrategy();
  private trendStrategy = new TrendFollowingStrategy();
  private momentumStrategy = new MomentumWindowStrategy();

  /**
   * Generate signals for a single pair using all strategies
   */
  generateSignals(pairData: ForexPairData): TradingSignal[] {
    const signals: TradingSignal[] = [];

    const swingSignal = this.swingStrategy.analyze(pairData);
    if (swingSignal) signals.push(swingSignal);

    const daySignal = this.dayStrategy.analyze(pairData);
    if (daySignal) signals.push(daySignal);

    const trendSignal = this.trendStrategy.analyze(pairData);
    if (trendSignal) signals.push(trendSignal);

    // Add 24-hour momentum window analysis
    const momentumSignal = this.momentumStrategy.analyze(pairData);
    if (momentumSignal) signals.push(momentumSignal);

    return signals;
  }

  /**
   * Generate signals for multiple pairs
   */
  generateMultipleSignals(pairDataList: ForexPairData[]): TradingSignal[] {
    const allSignals: TradingSignal[] = [];

    for (const pairData of pairDataList) {
      const signals = this.generateSignals(pairData);
      allSignals.push(...signals);
    }

    return allSignals;
  }
}

