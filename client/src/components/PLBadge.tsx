/**
 * P/L Badge Component
 * 
 * Displays real-time profit/loss for trading signals
 * - Green badge for "IN PROFIT"
 * - Red badge for "IN LOSS"
 * - Shows dollar amount and pips
 */

import { TrendingUp, TrendingDown } from "lucide-react";

interface PLBadgeProps {
  status: "in_profit" | "in_loss" | "hit_tp" | "hit_sl" | "market_closed";
  currentPrice: number;
  dollarPL: number;
  pips: number;
}

export function PLBadge({ status, currentPrice, dollarPL, pips }: PLBadgeProps) {
  // Determine badge styling based on status
  const isProfit = status === "in_profit" || status === "hit_tp";
  const bgColor = isProfit ? "bg-emerald-50" : "bg-red-50";
  const borderColor = isProfit ? "border-emerald-200" : "border-red-200";
  const textColor = isProfit ? "text-emerald-700" : "text-red-700";
  const accentColor = isProfit ? "text-emerald-600" : "text-red-600";

  // Format dollar amount
  const formattedDollar = dollarPL >= 0 ? `+$${dollarPL.toFixed(2)}` : `-$${Math.abs(dollarPL).toFixed(2)}`;
  
  // Format pips
  const formattedPips = pips >= 0 ? `+${pips.toFixed(1)}` : pips.toFixed(1);

  // Status label
  const statusLabel = isProfit ? "IN PROFIT" : "IN LOSS";

  // Handle special statuses
  if (status === "market_closed") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Market Closed</span>
        </div>
      </div>
    );
  }

  if (status === "hit_tp") {
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-5 w-5 ${accentColor}`} />
            <span className={`text-sm font-semibold ${textColor}`}>HIT TAKE PROFIT</span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${accentColor}`}>{formattedDollar}</div>
            <div className={`text-xs ${textColor}`}>{formattedPips} pips</div>
          </div>
        </div>
        <div className={`mt-1 text-xs ${textColor}`}>
          Live: ${currentPrice.toFixed(5)}
        </div>
      </div>
    );
  }

  if (status === "hit_sl") {
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className={`h-5 w-5 ${accentColor}`} />
            <span className={`text-sm font-semibold ${textColor}`}>HIT STOP LOSS</span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${accentColor}`}>{formattedDollar}</div>
            <div className={`text-xs ${textColor}`}>{formattedPips} pips</div>
          </div>
        </div>
        <div className={`mt-1 text-xs ${textColor}`}>
          Live: ${currentPrice.toFixed(5)}
        </div>
      </div>
    );
  }

  // Default: IN PROFIT or IN LOSS
  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProfit ? (
            <TrendingUp className={`h-5 w-5 ${accentColor}`} />
          ) : (
            <TrendingDown className={`h-5 w-5 ${accentColor}`} />
          )}
          <span className={`text-sm font-semibold ${textColor}`}>{statusLabel}</span>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${accentColor}`}>{formattedDollar}</div>
          <div className={`text-xs ${textColor}`}>{formattedPips} pips</div>
        </div>
      </div>
      <div className={`mt-1 text-xs ${textColor}`}>
        Live: ${currentPrice.toFixed(5)}
      </div>
    </div>
  );
}
