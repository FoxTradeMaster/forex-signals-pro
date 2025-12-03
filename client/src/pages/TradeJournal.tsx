import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X, 
  ArrowLeft, 
  DollarSign, 
  Percent,
  Target,
  Award,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function TradeJournal() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);

  // Check for pre-filled data from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillData = urlParams.get('prefill');
    if (prefillData) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillData));
        setNewTrade(prev => ({
          ...prev,
          pair: data.pair || prev.pair,
          tradeType: data.signalType || prev.tradeType,
          entryPrice: data.entryPrice?.toString() || prev.entryPrice,
          stopLoss: data.stopLoss?.toString() || prev.stopLoss,
          takeProfit: data.takeProfit?.toString() || prev.takeProfit,
          notes: data.notes || prev.notes,
        }));
        setIsCreateDialogOpen(true);
        // Clear the URL parameter
        window.history.replaceState({}, '', '/journal');
      } catch (e) {
        console.error('Failed to parse prefill data:', e);
      }
    }
  }, []);

  // Form state for creating trade
  const [newTrade, setNewTrade] = useState({
    pair: "",
    tradeType: "BUY" as "BUY" | "SELL",
    entryPrice: "",
    entryDate: new Date().toISOString().slice(0, 16),
    positionSize: "",
    notes: "",
    stopLoss: "",
    takeProfit: "",
  });

  // Form state for closing trade
  const [closeTrade, setCloseTrade] = useState({
    exitPrice: "",
    exitDate: new Date().toISOString().slice(0, 16),
  });

  // Fetch trades
  const { data: allTrades, isLoading: loadingTrades, refetch } = trpc.journal.getTrades.useQuery(
    {},
    { enabled: isAuthenticated }
  );

  const { data: enteredTrades } = trpc.journal.getTrades.useQuery(
    { status: "entered" },
    { enabled: isAuthenticated }
  );

  const { data: closedTrades } = trpc.journal.getTrades.useQuery(
    { status: "closed" },
    { enabled: isAuthenticated }
  );

  // Fetch statistics
  const { data: stats, isLoading: loadingStats } = trpc.journal.getStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Mutations
  const createTradeMutation = trpc.journal.createTrade.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      setNewTrade({
        pair: "",
        tradeType: "BUY",
        entryPrice: "",
        entryDate: new Date().toISOString().slice(0, 16),
        positionSize: "",
        notes: "",
        stopLoss: "",
        takeProfit: "",
      });
      toast.success("Trade created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create trade: ${error.message}`);
    },
  });

  const closeTradeMutation = trpc.journal.closeTrade.useMutation({
    onSuccess: () => {
      refetch();
      setIsCloseDialogOpen(false);
      setSelectedTrade(null);
      setCloseTrade({
        exitPrice: "",
        exitDate: new Date().toISOString().slice(0, 16),
      });
      toast.success("Trade closed successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to close trade: ${error.message}`);
    },
  });

  const handleCreateTrade = async () => {
    if (!newTrade.pair || !newTrade.entryPrice || !newTrade.entryDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    await createTradeMutation.mutateAsync(newTrade);
  };

  const handleCloseTrade = async () => {
    if (!selectedTrade || !closeTrade.exitPrice || !closeTrade.exitDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    await closeTradeMutation.mutateAsync({
      tradeId: selectedTrade.id,
      ...closeTrade,
    });
  };

  if (loading || loadingTrades) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trade journal...</p>
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
              You need to be logged in to access your trade journal
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

  const getCredibilityBadge = (winRate: number) => {
    if (winRate >= 70) return { label: "Elite Trader", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/20" };
    if (winRate >= 60) return { label: "Excellent", color: "text-green-600 bg-green-100 dark:bg-green-900/20" };
    if (winRate >= 50) return { label: "Good", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20" };
    return { label: "Developing", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/20" };
  };

  const badge = stats ? getCredibilityBadge(stats.winRate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-orange-500" />
                <div>
                  <h1 className="text-xl font-bold">Trade Journal</h1>
                  <p className="text-sm text-muted-foreground">
                    Track your actual trading performance
                  </p>
                </div>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Trade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Trade</DialogTitle>
                  <DialogDescription>
                    Record a trade you've entered manually
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pair">Currency Pair *</Label>
                      <Input
                        id="pair"
                        placeholder="EUR/USD"
                        value={newTrade.pair}
                        onChange={(e) => setNewTrade({ ...newTrade, pair: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradeType">Type *</Label>
                      <Select
                        value={newTrade.tradeType}
                        onValueChange={(value: "BUY" | "SELL") =>
                          setNewTrade({ ...newTrade, tradeType: value })
                        }
                      >
                        <SelectTrigger id="tradeType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">BUY</SelectItem>
                          <SelectItem value="SELL">SELL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entryPrice">Entry Price *</Label>
                      <Input
                        id="entryPrice"
                        type="number"
                        step="0.0001"
                        placeholder="1.0850"
                        value={newTrade.entryPrice}
                        onChange={(e) => setNewTrade({ ...newTrade, entryPrice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="positionSize">Position Size</Label>
                      <Input
                        id="positionSize"
                        placeholder="0.1 lots"
                        value={newTrade.positionSize}
                        onChange={(e) => setNewTrade({ ...newTrade, positionSize: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entryDate">Entry Date *</Label>
                    <Input
                      id="entryDate"
                      type="datetime-local"
                      value={newTrade.entryDate}
                      onChange={(e) => setNewTrade({ ...newTrade, entryDate: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stopLoss">Stop Loss</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        step="0.0001"
                        placeholder="1.0800"
                        value={newTrade.stopLoss}
                        onChange={(e) => setNewTrade({ ...newTrade, stopLoss: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="takeProfit">Take Profit</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        step="0.0001"
                        placeholder="1.0900"
                        value={newTrade.takeProfit}
                        onChange={(e) => setNewTrade({ ...newTrade, takeProfit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Trade rationale, strategy, etc."
                      value={newTrade.notes}
                      onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTrade} disabled={createTradeMutation.isPending}>
                    {createTradeMutation.isPending ? "Creating..." : "Create Trade"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Statistics Cards */}
        {stats && stats.totalTrades > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Trades</CardDescription>
                <CardTitle className="text-3xl">{stats.totalTrades}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.winningTrades} wins • {stats.losingTrades} losses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Win Rate</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {stats.winRate.toFixed(1)}%
                  {badge && (
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats.winRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total P/L</CardDescription>
                <CardTitle className={`text-3xl ${stats.totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.totalPL >= 0 ? "+" : ""}${stats.totalPL.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Avg: {stats.avgPL >= 0 ? "+" : ""}${stats.avgPL.toFixed(2)} per trade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Best Trade</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  +${stats.bestTrade ? parseFloat(stats.bestTrade.plDollars || "0").toFixed(2) : "0.00"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.bestTrade ? `${stats.bestTrade.pair} ${stats.bestTrade.tradeType}` : "No trades yet"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trades Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Trades</CardTitle>
            <CardDescription>
              Manual record of your actual trading activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({allTrades?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="entered">
                  Open ({enteredTrades?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedTrades?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <TradeTable
                  trades={allTrades || []}
                  onCloseTrade={(trade) => {
                    setSelectedTrade(trade);
                    setIsCloseDialogOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="entered">
                <TradeTable
                  trades={enteredTrades || []}
                  onCloseTrade={(trade) => {
                    setSelectedTrade(trade);
                    setIsCloseDialogOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="closed">
                <TradeTable trades={closedTrades || []} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Close Trade Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Trade</DialogTitle>
            <DialogDescription>
              Record the exit details for {selectedTrade?.pair} {selectedTrade?.tradeType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price *</Label>
              <Input
                id="exitPrice"
                type="number"
                step="0.0001"
                placeholder="1.0875"
                value={closeTrade.exitPrice}
                onChange={(e) => setCloseTrade({ ...closeTrade, exitPrice: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitDate">Exit Date *</Label>
              <Input
                id="exitDate"
                type="datetime-local"
                value={closeTrade.exitDate}
                onChange={(e) => setCloseTrade({ ...closeTrade, exitDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseTrade} disabled={closeTradeMutation.isPending}>
              {closeTradeMutation.isPending ? "Closing..." : "Close Trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeTable({ trades, onCloseTrade }: { trades: any[]; onCloseTrade?: (trade: any) => void }) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">No trades found</p>
        <p className="text-sm">Click "New Trade" to record your first trade</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Pair</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Entry</th>
            <th className="pb-3 font-medium">Exit</th>
            <th className="pb-3 font-medium">P/L</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const pl = trade.plDollars ? parseFloat(trade.plDollars) : null;
            const plPercent = trade.plPercentage ? parseFloat(trade.plPercentage) : null;

            return (
              <tr key={trade.id} className="border-b">
                <td className="py-3 font-medium">{trade.pair}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      trade.tradeType === "BUY"
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {trade.tradeType === "BUY" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {trade.tradeType}
                  </span>
                </td>
                <td className="py-3 text-sm">{trade.entryPrice}</td>
                <td className="py-3 text-sm">{trade.exitPrice || "-"}</td>
                <td className="py-3">
                  {pl !== null ? (
                    <div className={`font-medium ${pl >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                      {plPercent !== null && (
                        <span className="text-xs ml-1">
                          ({plPercent >= 0 ? "+" : ""}
                          {plPercent.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      trade.status === "entered"
                        ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {trade.status === "entered" ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  {new Date(trade.entryDate).toLocaleDateString()}
                </td>
                <td className="py-3">
                  {trade.status === "entered" && onCloseTrade && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCloseTrade(trade)}
                    >
                      Close
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
