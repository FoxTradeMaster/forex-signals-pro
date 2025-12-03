import { TrendingUp, TrendingDown } from "lucide-react";

interface PLBadgeProps {
  plDollars: number;
  plPips: number;
  currentPrice: number;
}

export function PLBadge({ plDollars, plPips, currentPrice }: PLBadgeProps) {
  const isProfit = plDollars >= 0;

  return (
    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Current Price:</span>
        <span className="text-xs font-medium">{currentPrice.toFixed(5)}</span>
      </div>
      
      <div className={`flex items-center justify-between p-2 rounded-lg ${
        isProfit ? "bg-green-500/10" : "bg-red-500/10"
      }`}>
        <div className="flex items-center gap-1">
          {isProfit ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-semibold ${
            isProfit ? "text-green-600" : "text-red-600"
          }`}>
            {isProfit ? "IN PROFIT" : "IN LOSS"}
          </span>
        </div>
        
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold ${
            isProfit ? "text-green-600" : "text-red-600"
          }`}>
            {isProfit ? "+" : ""}{plDollars.toFixed(2)} USD
          </span>
          <span className="text-xs text-muted-foreground">
            {isProfit ? "+" : ""}{plPips.toFixed(1)} pips
          </span>
        </div>
      </div>
    </div>
  );
}
