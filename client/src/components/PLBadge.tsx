import { TrendingUp, TrendingDown } from "lucide-react";

interface PLBadgeProps {
  plDollars: number;
  plPips: number;
  currentPrice: number;
}

export function PLBadge({ plDollars, plPips, currentPrice }: PLBadgeProps) {
  const isProfit = plDollars >= 0;

  return (
    <div
      className={`flex flex-col items-end px-2 py-1.5 rounded-lg text-right min-w-[90px] ${
        isProfit
          ? "bg-green-500/15 border border-green-500/30"
          : "bg-red-500/15 border border-red-500/30"
      }`}
    >
      {/* Current price line */}
      <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
        {currentPrice > 0 ? `@ ${currentPrice.toFixed(5)}` : "Live P/L"}
      </span>

      {/* Status label */}
      <div className="flex items-center gap-0.5">
        {isProfit ? (
          <TrendingUp className="w-3 h-3 text-green-600" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-600" />
        )}
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            isProfit ? "text-green-600" : "text-red-600"
          }`}
        >
          {isProfit ? "In Profit" : "In Loss"}
        </span>
      </div>

      {/* Dollar P/L */}
      <span
        className={`text-sm font-bold leading-tight ${
          isProfit ? "text-green-600" : "text-red-600"
        }`}
      >
        {isProfit ? "+" : ""}
        {plDollars.toFixed(2)} USD
      </span>

      {/* Pips */}
      <span className="text-[10px] text-muted-foreground leading-none">
        {isProfit ? "+" : ""}
        {plPips.toFixed(1)} pips
      </span>
    </div>
  );
}
