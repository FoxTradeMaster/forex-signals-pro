import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, TrendingUp, Target, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const { user, loading, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);

  // Fetch analytics data
  const { data: winRateByPair, isLoading: loadingWinRate } = trpc.analytics.getWinRateByPair.useQuery(
    { days: dateRange },
    { enabled: isAuthenticated }
  );

  const { data: performanceByTimeframe, isLoading: loadingTimeframe } = trpc.analytics.getPerformanceByTimeframe.useQuery(
    { days: dateRange },
    { enabled: isAuthenticated }
  );

  const { data: strategyPerformance, isLoading: loadingStrategy } = trpc.analytics.getStrategyPerformance.useQuery(
    { days: dateRange },
    { enabled: isAuthenticated }
  );

  const { data: dailyPLTrend, isLoading: loadingDailyPL } = trpc.analytics.getDailyPLTrend.useQuery(
    { days: dateRange },
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You need to be logged in to view analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Login to Continue</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Performance Analytics</h1>
                  <p className="text-sm text-muted-foreground">
                    Detailed insights into your trading signals
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Tabs value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v) as 7 | 30 | 90)}>
                <TabsList>
                  <TabsTrigger value="7">7 Days</TabsTrigger>
                  <TabsTrigger value="30">30 Days</TabsTrigger>
                  <TabsTrigger value="90">90 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Win Rate by Currency Pair */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Win Rate by Currency Pair
            </CardTitle>
            <CardDescription>
              Success rate for each currency pair over the last {dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWinRate ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : winRateByPair && winRateByPair.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={winRateByPair.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pair" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="winRate" fill="#f97316" name="Win Rate (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No data available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance by Timeframe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Performance by Timeframe
            </CardTitle>
            <CardDescription>
              Total P/L and win rate across different trading timeframes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTimeframe ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : performanceByTimeframe && performanceByTimeframe.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceByTimeframe}
                      dataKey="totalSignals"
                      nameKey="timeframe"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.timeframe}: ${entry.totalSignals}`}
                    >
                      {performanceByTimeframe.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {performanceByTimeframe.map((tf, index) => (
                    <div key={tf.timeframe} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium">{tf.timeframe}</p>
                          <p className="text-sm text-muted-foreground">
                            {tf.totalSignals} signals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tf.totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {tf.totalPL >= 0 ? "+" : ""}${tf.totalPL.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tf.winRate.toFixed(1)}% win rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No data available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Strategy Performance Comparison
            </CardTitle>
            <CardDescription>
              Compare the effectiveness of different trading strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStrategy ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : strategyPerformance && strategyPerformance.length > 0 ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={strategyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="strategy" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Win Rate (%)") return `${value.toFixed(1)}%`;
                        return `$${value.toFixed(2)}`;
                      }}
                      contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }}
                    />
                    <Legend />
                    <Bar dataKey="totalPL" fill="#8b5cf6" name="Total P/L ($)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="winRate" fill="#10b981" name="Win Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {strategyPerformance.map((strategy) => (
                    <Card key={strategy.strategy}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base capitalize">{strategy.strategy}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total P/L:</span>
                          <span className={`font-bold ${strategy.totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {strategy.totalPL >= 0 ? "+" : ""}${strategy.totalPL.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg P/L:</span>
                          <span className={`font-medium ${strategy.avgPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {strategy.avgPL >= 0 ? "+" : ""}${strategy.avgPL.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="font-medium">{strategy.winRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Signals:</span>
                          <span className="font-medium">{strategy.totalSignals}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No data available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily P/L Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Daily P/L Trend
            </CardTitle>
            <CardDescription>
              Cumulative profit/loss over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDailyPL ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : dailyPLTrend && dailyPLTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyPLTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="dailyPL"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Daily P/L ($)"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePL"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Cumulative P/L ($)"
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">No data available for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
