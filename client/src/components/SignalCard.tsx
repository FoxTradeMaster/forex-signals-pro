import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, TrendingUp, X } from "lucide-react";

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
    reason: string;
    indicators: Record<string, number>;
    createdAt: Date | string;
    isActive: string;
  };
  onDismiss?: (id: string) => void;
}

export function SignalCard({ signal, onDismiss }: SignalCardProps) {
  const isBuy = signal.signalType === "BUY";
  const strength = parseInt(signal.strength);

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
    <Card className={`relative ${isBuy ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}`}>
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
              </CardDescription>
            </div>
          </div>
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

        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Entry Price</div>
            <div className="font-semibold">{signal.entryPrice}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Stop Loss</div>
            <div className="font-semibold text-red-600">{signal.stopLoss}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Take Profit</div>
            <div className="font-semibold text-green-600">{signal.takeProfit}</div>
          </div>
        </div>

        {/* Reason */}
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{signal.reason}</p>
          </div>
        </div>

        {/* Indicators */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            {Object.entries(signal.indicators).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="uppercase">{key}:</span>
                <span className="font-mono">{typeof value === "number" ? value.toFixed(5) : value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          {new Date(signal.createdAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

