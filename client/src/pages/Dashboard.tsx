import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SignalCard } from "@/components/SignalCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { RefreshCw, Volume2, VolumeX, TrendingUp, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { volume, setVolume, enabled, setEnabled, playNotification } = useAudioNotification();
  const [lastSignalCount, setLastSignalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch active signals
  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = 
    trpc.signals.getActive.useQuery({ limit: 50 });

  // Fetch current session
  const { data: currentSession } = trpc.momentum.getCurrentSession.useQuery();

  // Fetch momentum analysis
  const { data: momentumData, isLoading: momentumLoading } = 
    trpc.momentum.analyzeAll.useQuery();

  // Generate signals mutation
  const generateSignals = trpc.signals.generateAll.useMutation({
    onSuccess: (newSignals) => {
      toast.success(`Generated ${newSignals.length} new trading signals!`);
      setLastUpdated(new Date());
      refetchSignals();
    },
    onError: (error) => {
      toast.error(`Failed to generate signals: ${error.message}`);
    },
  });

  // Play notification when new signals arrive
  useEffect(() => {
    if (signals && signals.length > lastSignalCount && lastSignalCount > 0) {
      const newSignals = signals.slice(0, signals.length - lastSignalCount);
      
      // Play appropriate sound based on signal type
      newSignals.forEach((signal) => {
        if (signal.signalType === "BUY") {
          playNotification("buy");
        } else if (signal.signalType === "SELL") {
          playNotification("sell");
        }
      });

      toast.info(`${newSignals.length} new trading signal${newSignals.length > 1 ? 's' : ''} detected!`);
    }
    
    if (signals) {
      setLastSignalCount(signals.length);
    }
  }, [signals, lastSignalCount, playNotification]);

  // Auto-refresh signals every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchSignals();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetchSignals]);

  const handleGenerateSignals = () => {
    generateSignals.mutate();
  };

  const buySignals = signals?.filter(s => s.signalType === "BUY") || [];
  const sellSignals = signals?.filter(s => s.signalType === "SELL") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
                🦊
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  FOX TRADE MASTER
                </h1>
                <p className="text-sm text-muted-foreground">Advanced Forex Trading Signals</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-sm text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              {/* Audio Controls */}
              <Card className="p-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="audio-enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Label htmlFor="audio-enabled" className="flex items-center gap-1 cursor-pointer">
                      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      <span className="text-sm">Alerts</span>
                    </Label>
                  </div>
                  {enabled && (
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <Slider
                        value={[volume * 100]}
                        onValueChange={([val]) => setVolume(val / 100)}
                        max={100}
                        step={1}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  )}
                </div>
              </Card>

              <Button
                onClick={handleGenerateSignals}
                disabled={generateSignals.isPending}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateSignals.isPending ? "animate-spin" : ""}`} />
                Generate Signals
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Current Session Banner */}
        {currentSession && (
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Active Trading Session</CardTitle>
                    <CardDescription className="text-orange-100">
                      {currentSession.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {currentSession.name}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Momentum Windows */}
        {momentumData && momentumData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                24-Hour Momentum Windows
              </CardTitle>
              <CardDescription>
                FOX TRADE MASTER proprietary session-based momentum analysis - Optimal trading windows based on market sessions and volatility patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {momentumData
                  .filter(d => d.windows.length > 0)
                  .slice(0, 6)
                  .map((data) => {
                    const bestWindow = data.windows[0];
                    return (
                      <Card key={data.pair} className={bestWindow.isActive ? "border-orange-500 border-2" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{data.pair}</CardTitle>
                            {bestWindow.isActive && (
                              <Badge className="bg-orange-500">ACTIVE</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Session:</span>
                            <span className="font-semibold">{bestWindow.sessionName}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Direction:</span>
                            <Badge variant={bestWindow.direction === "BULLISH" ? "default" : "destructive"}>
                              {bestWindow.direction}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Strength:</span>
                            <div className="flex gap-1">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    i < bestWindow.strength ? "bg-orange-500" : "bg-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Volatility:</span>
                            <span className="font-mono text-xs">{bestWindow.volatility}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Price Change:</span>
                            <span className={`font-mono text-xs ${bestWindow.priceChange > 0 ? "text-green-600" : "text-red-600"}`}>
                              {bestWindow.priceChange > 0 ? "+" : ""}{bestWindow.priceChange}%
                            </span>
                          </div>
                          {data.optimalTime.optimal && (
                            <div className="pt-2 border-t">
                              <Badge variant="outline" className="w-full justify-center text-xs">
                                ✓ Optimal Time
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trading Signals */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">
              All Signals ({signals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="buy" className="text-green-600">
              BUY ({buySignals.length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-red-600">
              SELL ({sellSignals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {signalsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-orange-500" />
                <p className="mt-4 text-muted-foreground">Loading signals...</p>
              </div>
            ) : signals && signals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {signals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Signals</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Generate Signals" to analyze current market conditions
                </p>
                <Button onClick={handleGenerateSignals} disabled={generateSignals.isPending}>
                  Generate Signals
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="buy" className="space-y-4">
            {buySignals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {buySignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No BUY signals available</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            {sellSignals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sellSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No SELL signals available</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

