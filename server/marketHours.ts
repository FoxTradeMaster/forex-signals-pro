/**
 * Market Hours Service
 * Tracks forex market hours and determines if specific currency pairs are tradeable
 */

export interface MarketStatus {
  isOpen: boolean;
  currentSession: string | null;
  nextOpenTime: Date | null;
  relevantMarkets: string[];
}

export interface ForexMarketHours {
  name: string;
  currencies: string[];
  openHour: number; // UTC
  closeHour: number; // UTC
  openDays: number[]; // 0 = Sunday, 6 = Saturday
}

/**
 * Major forex market hours (UTC)
 * Forex markets are open 24/5 (Sunday 5pm EST to Friday 5pm EST)
 */
export const FOREX_MARKETS: ForexMarketHours[] = [
  {
    name: "Sydney",
    currencies: ["AUD", "NZD"],
    openHour: 22, // 10pm UTC (Sunday)
    closeHour: 7,  // 7am UTC
    openDays: [0, 1, 2, 3, 4], // Sunday evening to Friday
  },
  {
    name: "Tokyo",
    currencies: ["JPY"],
    openHour: 0,  // 12am UTC
    closeHour: 9, // 9am UTC
    openDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
  {
    name: "London",
    currencies: ["EUR", "GBP", "CHF"],
    openHour: 8,  // 8am UTC
    closeHour: 17, // 5pm UTC
    openDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
  {
    name: "New York",
    currencies: ["USD", "CAD"],
    openHour: 13, // 1pm UTC
    closeHour: 22, // 10pm UTC
    openDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
];

/**
 * Check if forex market is open (24/5 operation)
 */
export function isForexMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  // Forex closes Friday 22:00 UTC (5pm EST) and opens Sunday 22:00 UTC (5pm EST)
  if (day === 6) return false; // Saturday - closed all day
  if (day === 0 && hour < 22) return false; // Sunday before 10pm UTC - closed
  if (day === 5 && hour >= 22) return false; // Friday after 10pm UTC - closed

  return true;
}

/**
 * Get next forex market open time
 */
export function getNextForexOpen(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  const nextOpen = new Date(now);

  // If it's Saturday, next open is Sunday 22:00 UTC
  if (day === 6) {
    nextOpen.setUTCDate(now.getUTCDate() + 1); // Move to Sunday
    nextOpen.setUTCHours(22, 0, 0, 0);
    return nextOpen;
  }

  // If it's Sunday before 22:00 UTC
  if (day === 0 && hour < 22) {
    nextOpen.setUTCHours(22, 0, 0, 0);
    return nextOpen;
  }

  // If it's Friday after 22:00 UTC
  if (day === 5 && hour >= 22) {
    const daysUntilSunday = 2; // Friday to Sunday
    nextOpen.setUTCDate(now.getUTCDate() + daysUntilSunday);
    nextOpen.setUTCHours(22, 0, 0, 0);
    return nextOpen;
  }

  // Market is currently open
  return now;
}

/**
 * Check if a specific currency pair is tradeable based on market hours
 */
export function getPairMarketStatus(pair: string): MarketStatus {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  // Extract currencies from pair (e.g., "EUR/USD" -> ["EUR", "USD"])
  const currencies = pair.split("/");

  // Check if forex market is open at all
  if (!isForexMarketOpen()) {
    return {
      isOpen: false,
      currentSession: null,
      nextOpenTime: getNextForexOpen(),
      relevantMarkets: [],
    };
  }

  // Find which markets are relevant for this pair
  const relevantMarkets: string[] = [];
  const activeMarkets: string[] = [];

  for (const market of FOREX_MARKETS) {
    // Check if this market handles any currency in the pair
    const isRelevant = currencies.some(curr => market.currencies.includes(curr));
    
    if (isRelevant) {
      relevantMarkets.push(market.name);

      // Check if this market is currently open
      const isMarketOpen = market.openDays.includes(day) &&
        ((market.openHour <= market.closeHour && hour >= market.openHour && hour < market.closeHour) ||
         (market.openHour > market.closeHour && (hour >= market.openHour || hour < market.closeHour)));

      if (isMarketOpen) {
        activeMarkets.push(market.name);
      }
    }
  }

  // Pair is tradeable if at least one relevant market is open
  const isOpen = activeMarkets.length > 0;

  return {
    isOpen,
    currentSession: activeMarkets.length > 0 ? activeMarkets.join(" & ") : null,
    nextOpenTime: isOpen ? null : getNextMarketOpen(currencies),
    relevantMarkets,
  };
}

/**
 * Get next open time for specific currencies
 */
function getNextMarketOpen(currencies: string[]): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  let earliestOpen: Date | null = null;

  for (const market of FOREX_MARKETS) {
    const isRelevant = currencies.some(curr => market.currencies.includes(curr));
    if (!isRelevant) continue;

    const nextOpen = new Date(now);

    // Find next time this market opens
    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
      const checkDate = new Date(now);
      checkDate.setUTCDate(now.getUTCDate() + daysAhead);
      const checkDay = checkDate.getUTCDay();

      if (market.openDays.includes(checkDay)) {
        checkDate.setUTCHours(market.openHour, 0, 0, 0);

        // If this time is in the future
        if (checkDate > now) {
          if (!earliestOpen || checkDate < earliestOpen) {
            earliestOpen = checkDate;
          }
          break;
        }
      }
    }
  }

  return earliestOpen || getNextForexOpen();
}

/**
 * Get current active trading session name
 */
export function getCurrentSessionName(): string {
  if (!isForexMarketOpen()) {
    return "Market Closed";
  }

  const now = new Date();
  const hour = now.getUTCHours();

  // Check for overlaps first
  if (hour >= 13 && hour < 17) {
    return "London/New York Overlap";
  }
  if (hour >= 8 && hour < 9) {
    return "Asian/London Overlap";
  }

  // Individual sessions
  if (hour >= 0 && hour < 9) {
    return "Asian Session";
  }
  if (hour >= 8 && hour < 17) {
    return "London Session";
  }
  if (hour >= 13 && hour < 22) {
    return "New York Session";
  }
  if (hour >= 22 || hour < 0) {
    return "Sydney Session";
  }

  return "Between Sessions";
}

/**
 * Format time until market opens
 */
export function formatTimeUntilOpen(nextOpen: Date): string {
  const now = new Date();
  const diffMs = nextOpen.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Opening soon";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Opens in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `Opens in ${hours}h ${minutes}m`;
  }
  return `Opens in ${minutes}m`;
}

