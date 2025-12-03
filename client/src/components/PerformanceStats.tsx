import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, DollarSign, Award } from "lucide-react";
import { useState, useEffect } from "react";

export function PerformanceStats() {
  const [mounted, setMounted] = useState(false);
  const { data: historicalData } = trpc.pl.getHistoricalPerformance.useQuery(
    { days: 30 },
    { enabled: mounted }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !historicalData || historicalData.totalSignals === 0) {
    return null;
  }

  // Use statistics from backend
  const totalSignals = historicalData.totalSignals;
  const winRate = historicalData.winRate;
  const totalPL = historicalData.totalPL;
  const avgPL = historicalData.avgPL;

  // Determine credibility badge
  let credibilityBadge = "Building Track Record";
  let badgeColor = "text-gray-600";
  if (winRate >= 80) {
    credibilityBadge = "Elite Performer";
    badgeColor = "text-purple-600";
  } else if (winRate >= 70) {
    credibilityBadge = "Excellent";
    badgeColor = "text-blue-600";
  } else if (winRate >= 60) {
    credibilityBadge = "Good";
    badgeColor = "text-green-600";
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" />
          30-Day Performance
        </h2>
        <span className={`text-sm font-semibold ${badgeColor}`}>
          {credibilityBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Win Rate</span>
          </div>
          <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">
            {Math.round((winRate / 100) * totalSignals)} wins / {totalSignals - Math.round((winRate / 100) * totalSignals)} losses
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total P/L</span>
          </div>
          <div className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">USD</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg P/L</span>
          </div>
          <div className={`text-2xl font-bold ${avgPL >= 0 ? "text-green-600" : "text-red-600"}`}>
            {avgPL >= 0 ? "+" : ""}{avgPL.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">per signal</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Verified</span>
          </div>
          <div className="text-sm font-semibold text-blue-600 mt-2">
            ✓ Performance Tracking
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Live data validation
          </div>
        </Card>
      </div>
    </div>
  );
}
