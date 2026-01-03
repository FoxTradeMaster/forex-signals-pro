import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, DollarSign, Award, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export function PerformanceStats() {
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: historicalData, refetch } = trpc.pl.getHistoricalPerformance.useQuery(
    { days: 30 },
    { enabled: mounted }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(async () => {
      await refetch();
      setLastUpdate(new Date());
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [mounted, refetch]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  // Format last update time
  const formatLastUpdate = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    return lastUpdate.toLocaleTimeString();
  };

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
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" />
            30-Day Performance
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {formatLastUpdate()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${badgeColor}`}>
            {credibilityBadge}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
