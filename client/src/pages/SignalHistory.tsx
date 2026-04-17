import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Download } from "lucide-react";
import { useLocation } from "wouter";

type TimeRange = "7d" | "30d" | "90d" | "all";

export default function SignalHistory() {
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Fetch historical performance data
  const daysMap: Record<TimeRange, number | undefined> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": undefined,
  };
  const { data: historyData, isLoading } = trpc.pl.getHistoricalPerformance.useQuery({
    days: daysMap[timeRange],
  });

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${value.toFixed(2)}`;
  };

  const formatPips = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)} pips`;
  };

  /**
   * Export the currently visible signals as a CSV file.
   * Uses a client-side Blob download — no server round-trip needed.
   */
  const exportCSV = () => {
    if (!historyData?.signals?.length) return;

    const headers = ["Pair", "Type", "Entry Price", "Close Price", "Outcome", "P/L ($)", "P/L (pips)", "Date"];
    const rows = historyData.signals.map((s) => {
      const outcome =
        (s as any).outcome === "target_hit"
          ? "TP Hit"
          : (s as any).outcome === "stop_loss_hit"
          ? "SL Hit"
          : "Active";
      const date = (s as any).closedAt
        ? new Date((s as any).closedAt).toLocaleDateString()
        : new Date(s.createdAt).toLocaleDateString();
      return [
        s.pair,
        s.signalType,
        s.entryPrice,
        s.currentPrice,
        outcome,
        s.plDollars.toFixed(2),
        s.plPips.toFixed(1),
        date,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fox-trade-master-signals-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading performance history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-3">
          {/* Row 1: Back button + Title */}
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold truncate">Signal Performance History</h1>
          </div>

          {/* Row 2: Time Range Filter + Export CSV — wraps on mobile */}
          <div className="flex flex-wrap gap-2 items-center">
            {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs px-3"
              >
                {range === "all" ? "All Time" : range.toUpperCase()}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!historyData?.signals?.length}
              className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50 text-xs px-3"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Statistics Cards */}
        {historyData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Signals</CardDescription>
                  <CardTitle className="text-3xl">{historyData.totalSignals}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Win Rate</CardDescription>
                  <CardTitle className={`text-3xl ${historyData.winRate >= 50 ? "text-green-600" : "text-red-600"}`}>
                    {historyData.winRate.toFixed(1)}%
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total P/L</CardDescription>
                  <CardTitle className={`text-3xl ${historyData.totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(historyData.totalPL)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Avg P/L per Signal</CardDescription>
                  <CardTitle className={`text-3xl ${historyData.avgPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(historyData.avgPL)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Best and Worst Signals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Signal */}
              {historyData.bestSignal && (
                <Card className="border-green-500 border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      Best Performing Signal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{historyData.bestSignal.pair}</span>
                      <Badge variant={historyData.bestSignal.signalType === "BUY" ? "default" : "destructive"}>
                        {historyData.bestSignal.signalType}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span>{historyData.bestSignal.entryPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price:</span>
                      <span>{historyData.bestSignal.currentPrice}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-green-600">
                      <span>P/L:</span>
                      <div className="text-right">
                        <div>{formatCurrency(historyData.bestSignal.plDollars)}</div>
                        <div className="text-sm">{formatPips(historyData.bestSignal.plPips)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Worst Signal */}
              {historyData.worstSignal && (
                <Card className="border-red-500 border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      Worst Performing Signal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{historyData.worstSignal.pair}</span>
                      <Badge variant={historyData.worstSignal.signalType === "BUY" ? "default" : "destructive"}>
                        {historyData.worstSignal.signalType}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span>{historyData.worstSignal.entryPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price:</span>
                      <span>{historyData.worstSignal.currentPrice}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-red-600">
                      <span>P/L:</span>
                      <div className="text-right">
                        <div>{formatCurrency(historyData.worstSignal.plDollars)}</div>
                        <div className="text-sm">{formatPips(historyData.worstSignal.plPips)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Signals Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Signals</CardTitle>
                <CardDescription>
                  Showing {historyData.signals.length} signals from the last {timeRange === "all" ? "all time" : timeRange}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Pair</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-right py-3 px-4">Entry</th>
                        <th className="text-right py-3 px-4">Close Price</th>
                        <th className="text-center py-3 px-4">Outcome</th>
                        <th className="text-right py-3 px-4">P/L ($)</th>
                        <th className="text-right py-3 px-4">P/L (pips)</th>
                        <th className="text-right py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.signals.map((signal) => (
                        <tr key={signal.signalId} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-semibold">{signal.pair}</td>
                          <td className="py-3 px-4">
                            <Badge variant={signal.signalType === "BUY" ? "default" : "destructive"} className="text-xs">
                              {signal.signalType}
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-4">{signal.entryPrice}</td>
                          <td className="text-right py-3 px-4">{signal.currentPrice}</td>
                          <td className="text-center py-3 px-4">
                            {(signal as any).outcome === "target_hit" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                ✅ TP Hit
                              </span>
                            ) : (signal as any).outcome === "stop_loss_hit" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                ❌ SL Hit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                ⏳ Active
                              </span>
                            )}
                          </td>
                          <td className={`text-right py-3 px-4 font-semibold ${signal.plDollars >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(signal.plDollars)}
                          </td>
                          <td className={`text-right py-3 px-4 ${signal.plPips >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPips(signal.plPips)}
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                            {(signal as any).closedAt
                              ? new Date((signal as any).closedAt).toLocaleDateString()
                              : new Date(signal.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {historyData.signals.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No signals found for this time period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
