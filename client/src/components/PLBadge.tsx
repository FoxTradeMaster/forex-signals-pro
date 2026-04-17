import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useState } from "react";
import { PLChartOverlay } from "./PLChartOverlay";

interface PLBadgeProps {
  plDollars: number;
  plPips: number;
  currentPrice: number;
  marketClosed?: boolean;
  signal?: {
    pair: string;
    signalType: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit: string;
  };
}

export function PLBadge({ plDollars, plPips, currentPrice, marketClosed = false, signal }: PLBadgeProps) {
  const [chartOpen, setChartOpen] = useState(false);
  const isProfit = plDollars >= 0;

  const badge = (
    <div
      onClick={() => signal && setChartOpen(true)}
      className={`flex flex-col items-end px-2 py-1.5 rounded-lg text-right min-w-[90px] transition-all ${
        marketClosed
          ? "bg-gray-500/10 border border-gray-400/30 opacity-80"
          : isProfit
          ? "bg-green-500/15 border border-green-500/30"
          : "bg-red-500/15 border border-red-500/30"
      } ${signal ? "cursor-pointer hover:scale-105 hover:shadow-md" : ""}`}
    >
      {/* Market closed label or current price */}
      {marketClosed ? (
        <span className="flex items-center gap-0.5 text-[10px] text-gray-500 leading-none mb-0.5">
          <Clock className="w-2.5 h-2.5" />
          Market Closed
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
          {currentPrice > 0 ? `@ ${currentPrice.toFixed(5)}` : "Live P/L"}
        </span>
      )}

      {/* Status label */}
      <div className="flex items-center gap-0.5">
        {isProfit ? (
          <TrendingUp className={`w-3 h-3 ${marketClosed ? "text-gray-500" : "text-green-600"}`} />
        ) : (
          <TrendingDown className={`w-3 h-3 ${marketClosed ? "text-gray-500" : "text-red-600"}`} />
        )}
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            marketClosed ? "text-gray-500" : isProfit ? "text-green-600" : "text-red-600"
          }`}
        >
          {isProfit ? "In Profit" : "In Loss"}
        </span>
      </div>

      {/* Dollar P/L */}
      <span
        className={`text-sm font-bold leading-tight ${
          marketClosed ? "text-gray-500" : isProfit ? "text-green-600" : "text-red-600"
        }`}
      >
        {isProfit ? "+" : ""}
        {plDollars.toFixed(2)} USD
      </span>

      {/* Pips */}
      <span className={`text-[10px] leading-none ${marketClosed ? "text-gray-400" : "text-muted-foreground"}`}>
        {isProfit ? "+" : ""}
        {plPips.toFixed(1)} pips
      </span>

      {/* Tap hint */}
      {signal && (
        <span className="text-[9px] text-muted-foreground/60 leading-none mt-0.5">tap for chart</span>
      )}
    </div>
  );

  return (
    <>
      {badge}
      {signal && (
        <PLChartOverlay
          open={chartOpen}
          onClose={() => setChartOpen(false)}
          signal={signal}
          currentPrice={currentPrice}
          plDollars={plDollars}
          plPips={plPips}
        />
      )}
    </>
  );
}
