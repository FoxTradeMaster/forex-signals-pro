import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, TrendingUp, X, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PLBadge } from "@/components/PLBadge";
import { useState, useEffect } from "react";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    signalType: string;
    strength: string;
    strategy: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit: string;
    timeframe: string;
    reasoning: string;
    createdAt: Date;
  };
  onDismiss?: (id: string) => void;
  isPremium?: boolean; // Whether user has premium access
}

export function SignalCard({ signal, onDismiss, isPremium = false }: SignalCardProps) {
  const [mounted, setMounted] = useState(false);
  const isBuy = signal.signalType === "BUY";
  const strength = parseInt(signal.strength);
  const isHighPriority = strength >= 7; // High priority signals get blinking alert

  // Fetch market status for this pair
  const { data: marketStatus } = trpc.market.getPairStatus.useQuery({ pair: signal.pair });
  const isMarketClosed = marketStatus && !marketStatus.isOpen;

  // Check if this pair is locked (not EUR/USD and user is not premium)
  const isLocked = signal.pair !== "EUR/USD" && !isPremium;

  // Fetch P/L data (only for premium users)
  const { data: plData } = trpc.pl.getSignalPerformance.useQuery(
    { signalId: signal.id },
    { enabled: mounted && isPremium && !isLocked }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const strategyLabels: Record<string, string> = {
    swing: "Swing Trading",
    day: "Day Trading",
    trend: "Trend Following",
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 9) return "bg-green-500";
    if (strength >= 7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Card className={`relative ${isBuy ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"} ${
      isHighPriority ? "shadow-lg" : ""
    } ${
      isMarketClosed ? "opacity-60 bg-muted/30" : ""
    }`}>
      {/* Blinking Alert Indicator for High Priority Signals */}
      {isHighPriority && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isBuy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {isBuy ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-xl">{signal.pair}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{strategyLabels[signal.strategy]}</Badge>
                <Badge variant="outline">{signal.timeframe}</Badge>
                {isHighPriority && !isMarketClosed && (
                  <Badge className="bg-orange-500 text-white animate-pulse">
                    🔥 HIGH PRIORITY
                  </Badge>
                )}
                {isMarketClosed && (
                  <Badge variant="outline" className="bg-gray-500/20 text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Market Closed
                  </Badge>
                )}
              </CardDescription>
              {isMarketClosed && marketStatus?.nextOpenFormatted && (
                <p className="text-xs text-muted-foreground mt-1">
                  {marketStatus.nextOpenFormatted}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* P/L Badge (only for premium users with unlocked signals) */}
            {mounted && isPremium && !isLocked && plData && (
              <PLBadge
                plDollars={parseFloat(plData.plDollars || "0")}
                plPips={parseFloat(plData.plPips || "0")}
                currentPrice={parseFloat(plData.currentPrice || "0")}
              />
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDismiss(signal.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Signal Type and Strength */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-2xl font-bold ${isBuy ? "text-green-600" : "text-red-600"}`}>
              {signal.signalType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Strength:</span>
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < strength ? getStrengthColor(strength) : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">{strength}/10</span>
          </div>
        </div>

                   <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Entry Price</p>
                  <p className={`font-mono font-semibold ${isLocked ? "blur-sm select-none" : ""}`}>
                    {isLocked ? "X.XXXX" : signal.entryPrice}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stop Loss</p>
                  <p className={`font-mono font-semibold text-red-600 ${isLocked ? "blur-sm select-none" : ""}`}>
                    {isLocked ? "X.XXXX" : signal.stopLoss}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Take Profit</p>
                  <p className={`font-mono font-semibold text-green-600 ${isLocked ? "blur-sm select-none" : ""}`}>
                    {isLocked ? "X.XXXX" : signal.takeProfit}
                  </p>
                </div>
              </div>

              {/* Premium Upsell for Locked Signals */}
              {isLocked && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-semibold mb-1">
                    🔒 Premium Signal
                  </p>
                  <p className="text-xs text-orange-700">
                    Upgrade to Premium to unlock all currency pairs and full signal details.
                  </p>
                </div>
              )}

        {/* Reason */}
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          <div>{new Date(signal.createdAt).toLocaleString()}</div>
          <div className="text-[10px] mt-0.5">
            {(() => {
              const now = new Date();
              const created = new Date(signal.createdAt);
              const diffMs = now.getTime() - created.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              
              if (diffMins < 1) return "Just now";
              if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
              if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

