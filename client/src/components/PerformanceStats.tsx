import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  DollarSign,
  Award,
  CheckCircle2
} from "lucide-react";

export function PerformanceStats() {
  // Fetch 30-day performance statistics
  const { data: stats, isLoading } = trpc.pl.getHistoricalPerformance.useQuery({
    dateRange: "30d",
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading statistics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.stats.totalSignals === 0) {
    return null; // Don't show if no data
  }

  const { 
    totalSignals, 
    winRate, 
    totalProfitLoss, 
    averageProfitLoss 
  } = stats.stats;

  // Determine credibility badge
  const getCredibilityBadge = () => {
    if (winRate >= 80) {
      return { text: "🏆 Elite Performer", color: "bg-yellow-500 text-white" };
    } else if (winRate >= 70) {
      return { text: "⭐ Excellent", color: "bg-green-500 text-white" };
    } else if (winRate >= 60) {
      return { text: "✓ Good", color: "bg-blue-500 text-white" };
    } else {
      return { text: "📈 Building Track Record", color: "bg-gray-500 text-white" };
    }
  };

  const credibilityBadge = getCredibilityBadge();

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Trophy className="h-5 w-5 text-yellow-500" />
              30-Day Performance
            </CardTitle>
            <CardDescription className="text-blue-700">
              Live signal validation and credibility metrics
            </CardDescription>
          </div>
          <Badge className={credibilityBadge.color}>
            {credibilityBadge.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Signals */}
          <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Signals</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalSignals}</div>
            <div className="text-xs text-blue-600 mt-1">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              Tracked
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-white/60 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              {winRate >= 70 ? '🔥 Excellent' : winRate >= 60 ? '✓ Good' : '📈 Growing'}
            </div>
          </div>

          {/* Total P/L */}
          <div className={`bg-white/60 rounded-lg p-3 border ${
            totalProfitLoss >= 0 ? 'border-green-100' : 'border-red-100'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-xs text-muted-foreground">Total P/L</span>
            </div>
            <div className={`text-2xl font-bold ${
              totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss >= 0 ? '$' : '-$'}
              {Math.abs(totalProfitLoss).toFixed(2)}
            </div>
            <div className={`text-xs mt-1 ${
              totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalProfitLoss >= 0 ? 'Profitable' : 'In Drawdown'}
            </div>
          </div>

          {/* Average P/L */}
          <div className={`bg-white/60 rounded-lg p-3 border ${
            averageProfitLoss >= 0 ? 'border-green-100' : 'border-red-100'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`h-4 w-4 ${averageProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-xs text-muted-foreground">Avg P/L</span>
            </div>
            <div className={`text-2xl font-bold ${
              averageProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {averageProfitLoss >= 0 ? '+' : ''}{averageProfitLoss >= 0 ? '$' : '-$'}
              {Math.abs(averageProfitLoss).toFixed(2)}
            </div>
            <div className={`text-xs mt-1 ${
              averageProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Per Signal
            </div>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-4 p-3 bg-white/80 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-semibold">
              Verified Performance Tracking
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {totalSignals}+ signals validated
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
