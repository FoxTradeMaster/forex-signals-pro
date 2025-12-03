import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Trophy, 
  Target,
  DollarSign,
  Percent,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export default function SignalHistory() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Fetch historical signal performance
  const { data: historyData, isLoading } = trpc.pl.getHistoricalPerformance.useQuery({
    dateRange,
  });

  // Calculate statistics
  const stats = historyData?.stats || {
    totalSignals: 0,
    profitableSignals: 0,
    losingSignals: 0,
    winRate: 0,
    totalProfitLoss: 0,
    averageProfitLoss: 0,
    bestSignal: null,
    worstSignal: null,
  };

  const formatCurrency = (value: number) => {
    return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
  };

  const formatPips = (value: number) => {
    return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Signal History
                </h1>
                <p className="text-sm text-muted-foreground">
                  Track your trading signal performance over time
                </p>
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex gap-2">
              <Button
                variant={dateRange === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("7d")}
              >
                7 Days
              </Button>
              <Button
                variant={dateRange === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("30d")}
              >
                30 Days
              </Button>
              <Button
                variant={dateRange === "90d" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("90d")}
              >
                90 Days
              </Button>
              <Button
                variant={dateRange === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("all")}
              >
                All Time
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total Signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSignals}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.profitableSignals} profitable • {stats.losingSignals} losses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Win Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.winRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Success rate across all signals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total P/L
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totalProfitLoss)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cumulative profit/loss
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Avg P/L
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.averageProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.averageProfitLoss)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per signal average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Best and Worst Signals */}
        {(stats.bestSignal || stats.worstSignal) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {stats.bestSignal && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-5 w-5" />
                    Best Signal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{stats.bestSignal.pair}</span>
                      <Badge variant="outline" className="bg-green-100">
                        {stats.bestSignal.signalType}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.bestSignal.dollarPL)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPips(stats.bestSignal.pips)} pips • {new Date(stats.bestSignal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.worstSignal && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-5 w-5" />
                    Worst Signal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{stats.worstSignal.pair}</span>
                      <Badge variant="outline" className="bg-red-100">
                        {stats.worstSignal.signalType}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(stats.worstSignal.dollarPL)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPips(stats.worstSignal.pips)} pips • {new Date(stats.worstSignal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Historical Signals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Signal History
            </CardTitle>
            <CardDescription>
              Detailed performance history of all closed signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading history...
              </div>
            ) : historyData?.signals && historyData.signals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Pips</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.signals.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell className="text-sm">
                        {new Date(signal.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{signal.pair}</TableCell>
                      <TableCell>
                        <Badge variant={signal.signalType === "BUY" ? "default" : "destructive"}>
                          {signal.signalType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseFloat(signal.entryPrice).toFixed(5)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {signal.currentPrice ? parseFloat(signal.currentPrice).toFixed(5) : '-'}
                      </TableCell>
                      <TableCell className={`font-semibold ${
                        parseFloat(signal.pips || '0') >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPips(parseFloat(signal.pips || '0'))}
                      </TableCell>
                      <TableCell className={`font-semibold ${
                        parseFloat(signal.dollarPL || '0') >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(parseFloat(signal.dollarPL || '0'))}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            signal.status === 'hit_tp' ? 'bg-green-100 text-green-700' :
                            signal.status === 'hit_sl' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }
                        >
                          {signal.status === 'hit_tp' ? 'Hit TP' :
                           signal.status === 'hit_sl' ? 'Hit SL' :
                           signal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No historical signals found for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
