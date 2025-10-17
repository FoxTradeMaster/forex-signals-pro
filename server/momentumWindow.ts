/**
 * 24-Hour Momentum Window Analyzer
 * Identifies optimal trading windows based on market sessions and momentum
 * Advanced strategy for exploiting session overlaps and volatility patterns
 */

import { OHLCData } from "./forexData";

export interface MomentumWindow {
  startTime: Date;
  endTime: Date;
  sessionName: string;
  strength: number; // 1-10
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  volatility: number;
  volume: number;
  priceChange: number;
  isActive: boolean;
  recommendation: string;
}

export interface SessionOverlap {
  name: string;
  startHour: number; // UTC hour
  endHour: number;
  description: string;
}

/**
 * Major forex trading sessions (in UTC)
 */
export const TRADING_SESSIONS: SessionOverlap[] = [
  {
    name: "Asian Session",
    startHour: 0,
    endHour: 9,
    description: "Tokyo market - JPY pairs most active",
  },
  {
    name: "London Session",
    startHour: 8,
    endHour: 17,
    description: "European market - EUR, GBP pairs most active",
  },
  {
    name: "New York Session",
    startHour: 13,
    endHour: 22,
    description: "US market - USD pairs most active",
  },
  {
    name: "Asian/London Overlap",
    startHour: 8,
    endHour: 9,
    description: "High volatility window - 1 hour overlap",
  },
  {
    name: "London/New York Overlap",
    startHour: 13,
    endHour: 17,
    description: "Highest volume window - 4 hour overlap",
  },
];

/**
 * Analyze 24-hour momentum windows
 */
export class MomentumWindowAnalyzer {
  /**
   * Detect current active session
   */
  getCurrentSession(): SessionOverlap | null {
    const now = new Date();
    const currentHour = now.getUTCHours();

    // Check overlaps first (higher priority)
    for (const session of TRADING_SESSIONS) {
      if (session.name.includes("Overlap")) {
        if (currentHour >= session.startHour && currentHour < session.endHour) {
          return session;
        }
      }
    }

    // Check regular sessions
    for (const session of TRADING_SESSIONS) {
      if (!session.name.includes("Overlap")) {
        if (currentHour >= session.startHour && currentHour < session.endHour) {
          return session;
        }
      }
    }

    return null;
  }

  /**
   * Analyze momentum strength in the last 24 hours
   */
  analyze24HourMomentum(ohlc: OHLCData, pair: string): MomentumWindow[] {
    const windows: MomentumWindow[] = [];
    const now = new Date();

    // Get data from last 24 hours (assuming 15m or 1h intervals)
    const last24Hours = this.filterLast24Hours(ohlc);

    if (last24Hours.close.length < 10) {
      return windows; // Not enough data
    }

    // Analyze each major session window
    for (const session of TRADING_SESSIONS) {
      const sessionData = this.getSessionData(last24Hours, session);
      
      if (sessionData.close.length === 0) continue;

      const analysis = this.analyzeSessionMomentum(sessionData, session, pair);
      if (analysis) {
        windows.push(analysis);
      }
    }

    return windows.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Filter OHLC data to last 24 hours
   */
  private filterLast24Hours(ohlc: OHLCData): OHLCData {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const filtered: OHLCData = {
      timestamps: [],
      open: [],
      high: [],
      low: [],
      close: [],
      volume: [],
    };

    for (let i = 0; i < ohlc.timestamps.length; i++) {
      const timestamp = ohlc.timestamps[i] * 1000; // Convert to ms
      if (timestamp >= twentyFourHoursAgo) {
        filtered.timestamps.push(ohlc.timestamps[i]);
        filtered.open.push(ohlc.open[i]);
        filtered.high.push(ohlc.high[i]);
        filtered.low.push(ohlc.low[i]);
        filtered.close.push(ohlc.close[i]);
        filtered.volume.push(ohlc.volume[i]);
      }
    }

    return filtered;
  }

  /**
   * Get data for a specific session
   */
  private getSessionData(ohlc: OHLCData, session: SessionOverlap): OHLCData {
    const sessionData: OHLCData = {
      timestamps: [],
      open: [],
      high: [],
      low: [],
      close: [],
      volume: [],
    };

    for (let i = 0; i < ohlc.timestamps.length; i++) {
      const date = new Date(ohlc.timestamps[i] * 1000);
      const hour = date.getUTCHours();

      // Check if this data point falls within the session
      let inSession = false;
      if (session.startHour < session.endHour) {
        inSession = hour >= session.startHour && hour < session.endHour;
      } else {
        // Handle sessions that cross midnight
        inSession = hour >= session.startHour || hour < session.endHour;
      }

      if (inSession) {
        sessionData.timestamps.push(ohlc.timestamps[i]);
        sessionData.open.push(ohlc.open[i]);
        sessionData.high.push(ohlc.high[i]);
        sessionData.low.push(ohlc.low[i]);
        sessionData.close.push(ohlc.close[i]);
        sessionData.volume.push(ohlc.volume[i]);
      }
    }

    return sessionData;
  }

  /**
   * Analyze momentum for a specific session
   */
  private analyzeSessionMomentum(
    sessionData: OHLCData,
    session: SessionOverlap,
    pair: string
  ): MomentumWindow | null {
    if (sessionData.close.length === 0) return null;

    const firstPrice = sessionData.open[0];
    const lastPrice = sessionData.close[sessionData.close.length - 1];
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    // Calculate volatility (average true range as percentage)
    let totalRange = 0;
    for (let i = 0; i < sessionData.high.length; i++) {
      const range = sessionData.high[i] - sessionData.low[i];
      totalRange += range;
    }
    const avgRange = totalRange / sessionData.high.length;
    const volatility = (avgRange / lastPrice) * 100;

    // Calculate average volume
    const avgVolume = sessionData.volume.reduce((a, b) => a + b, 0) / sessionData.volume.length;

    // Determine direction
    let direction: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
    if (Math.abs(priceChange) > 0.1) {
      direction = priceChange > 0 ? "BULLISH" : "BEARISH";
    }

    // Calculate strength (1-10)
    let strength = 5; // Base strength

    // Boost strength based on volatility
    if (volatility > 0.5) strength += 2;
    else if (volatility > 0.3) strength += 1;

    // Boost strength based on price movement
    if (Math.abs(priceChange) > 0.5) strength += 2;
    else if (Math.abs(priceChange) > 0.2) strength += 1;

    // Boost for overlap sessions (higher liquidity)
    if (session.name.includes("Overlap")) {
      strength += 1;
    }

    // Cap at 10
    strength = Math.min(10, strength);

    // Check if session is currently active
    const now = new Date();
    const currentHour = now.getUTCHours();
    let isActive = false;
    if (session.startHour < session.endHour) {
      isActive = currentHour >= session.startHour && currentHour < session.endHour;
    } else {
      isActive = currentHour >= session.startHour || currentHour < session.endHour;
    }

    // Generate recommendation
    let recommendation = "";
    if (isActive && strength >= 7) {
      if (direction === "BULLISH") {
        recommendation = `Strong bullish momentum during ${session.name}. Consider BUY positions.`;
      } else if (direction === "BEARISH") {
        recommendation = `Strong bearish momentum during ${session.name}. Consider SELL positions.`;
      } else {
        recommendation = `High volatility during ${session.name}. Wait for clear direction.`;
      }
    } else if (isActive) {
      recommendation = `${session.name} is active. Moderate momentum - ${direction.toLowerCase()} bias.`;
    } else {
      recommendation = `${session.name} opens in ${this.getHoursUntilSession(session)} hours. ${direction} momentum expected.`;
    }

    const startTime = new Date();
    startTime.setUTCHours(session.startHour, 0, 0, 0);
    
    const endTime = new Date();
    endTime.setUTCHours(session.endHour, 0, 0, 0);

    return {
      startTime,
      endTime,
      sessionName: session.name,
      strength,
      direction,
      volatility: parseFloat(volatility.toFixed(3)),
      volume: avgVolume,
      priceChange: parseFloat(priceChange.toFixed(3)),
      isActive,
      recommendation,
    };
  }

  /**
   * Calculate hours until session starts
   */
  private getHoursUntilSession(session: SessionOverlap): number {
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    let hoursUntil = session.startHour - currentHour;
    if (hoursUntil < 0) {
      hoursUntil += 24;
    }
    
    return hoursUntil;
  }

  /**
   * Get the best trading window for current time
   */
  getBestCurrentWindow(windows: MomentumWindow[]): MomentumWindow | null {
    const activeWindows = windows.filter(w => w.isActive);
    
    if (activeWindows.length === 0) return null;
    
    // Return the strongest active window
    return activeWindows.reduce((best, current) => 
      current.strength > best.strength ? current : best
    );
  }

  /**
   * Check if current time is optimal for a specific pair
   */
  isOptimalTradingTime(pair: string): { optimal: boolean; reason: string } {
    const currentSession = this.getCurrentSession();
    
    if (!currentSession) {
      return {
        optimal: false,
        reason: "No major trading session currently active",
      };
    }

    // Check if pair matches session
    const pairCurrency = pair.split("/")[0];
    
    if (currentSession.name.includes("Overlap")) {
      return {
        optimal: true,
        reason: `${currentSession.name} - highest volume and volatility period`,
      };
    }

    // Match currency to session
    if (currentSession.name.includes("Asian") && (pairCurrency === "JPY" || pair.includes("CNY"))) {
      return {
        optimal: true,
        reason: "Asian session - optimal for JPY and CNY pairs",
      };
    }

    if (currentSession.name.includes("London") && (pairCurrency === "EUR" || pairCurrency === "GBP")) {
      return {
        optimal: true,
        reason: "London session - optimal for EUR and GBP pairs",
      };
    }

    if (currentSession.name.includes("New York") && pairCurrency === "USD") {
      return {
        optimal: true,
        reason: "New York session - optimal for USD pairs",
      };
    }

    return {
      optimal: false,
      reason: `${currentSession.name} active, but not optimal for ${pair}`,
    };
  }
}

