import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { SignalCard } from "@/components/SignalCard";
import { ExpiryBanner } from "@/components/ExpiryBanner";
import { PerformanceStats } from "@/components/PerformanceStats";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useAuth } from "@/_core/hooks/useAuth";
import { RefreshCw, Volume2, VolumeX, TrendingUp, Clock, Zap, Filter, Crown, Search, Bell, BookOpen, BarChart3, Brain, Flame, Activity } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import { SignalOfTheDayBanner } from "@/components/SignalOfTheDayBanner";
import { toast } from "sonner";

export default function Dashboard() {
  const { volume, setVolume, enabled, setEnabled, playNotification } = useAudioNotification();
  const { user } = useAuth(); // Get user to check admin role
  const [lastSignalCount, setLastSignalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hideClosedMarkets, setHideClosedMarkets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check subscription status
  const { data: subscriptionStatus } = trpc.subscription.getStatus.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isPremium = subscriptionStatus?.isActive || false;
  const currentTier = subscriptionStatus?.tier || 'free';
  const isPro = currentTier === 'pro';
  
  // Tier-based pair counts
  const tierPairCounts = {
    free: 1,
    premium: 10,
    pro: 156,
  };
  const availablePairs = tierPairCounts[currentTier as keyof typeof tierPairCounts] || 1;
  
  // Debug: Log subscription status
  console.log('Subscription Status:', subscriptionStatus);
  console.log('Current Tier:', currentTier);
  console.log('Available Pairs:', availablePairs);

  // Fetch active signals with live prices and P/L data
  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = 
    trpc.signals.getWithStatus.useQuery({ limit: 50 }, {
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes to keep P/L current
    });

  // Fetch signal stats (count, last generated, streak)
  const { data: signalStats, refetch: refetchStats } = trpc.signals.getStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch market statuses
  const { data: marketStatuses } = trpc.market.getAllPairStatuses.useQuery();

  // Fetch current session
  const { data: currentSession } = trpc.momentum.getCurrentSession.useQuery();

  // Fetch momentum analysis
  const { data: momentumData, isLoading: momentumLoading } = 
    trpc.momentum.analyzeAll.useQuery();

  // Local override for signals — set immediately from generateAll response
  const [localSignals, setLocalSignals] = useState<typeof signals | null>(null);

  // Generate signals mutation
  const generateSignals = trpc.signals.generateAll.useMutation({
    onSuccess: (newSignals) => {
      toast.success(`Generated ${newSignals.length} new trading signals!`);
      setLastUpdated(new Date());
      // Immediately display the returned signals without waiting for DB query
      const mapped = newSignals.map((s: any) => ({
        id: s.id,
        pair: s.pair,
        signalType: s.signalType,
        strength: typeof s.strength === 'number' ? String(s.strength) : s.strength,
        strategy: s.strategy,
        entryPrice: typeof s.entryPrice === 'number' ? String(s.entryPrice) : s.entryPrice,
        stopLoss: typeof s.stopLoss === 'number' ? String(s.stopLoss) : s.stopLoss,
        takeProfit: typeof s.takeProfit === 'number' ? String(s.takeProfit) : s.takeProfit,
        timeframe: s.timeframe,
        reason: s.reason || s.aiReasoning || '',
        indicators: typeof s.indicators === 'string' ? JSON.parse(s.indicators) : (s.indicators || {}),
        createdAt: s.timestamp ? new Date(s.timestamp) : new Date(),
        isActive: 'true',
        aiReasoning: s.aiReasoning || null,
        aiConfidence: s.aiConfidence != null ? String(s.aiConfidence) : null,
        aiKeyFactors: s.aiKeyFactors ? (typeof s.aiKeyFactors === 'string' ? s.aiKeyFactors : JSON.stringify(s.aiKeyFactors)) : null,
        aiInsight: s.aiInsight || null,
        isAiGenerated: s.isAiGenerated ? 'true' : 'false',
        // New signals just generated — no live price yet, P/L will show after first refresh
        status: 'active' as const,
        currentPrice: null as number | null,
        plDollars: null as number | null,
        plPips: null as number | null,
      }));
      setLocalSignals(mapped);
      refetchSignals();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to generate signals: ${error.message}`);
    },
  });

  // Play notification when new signals arrive
  useEffect(() => {
    if (signals && signals.length > lastSignalCount && lastSignalCount > 0) {
      const newSignals = signals.slice(0, signals.length - lastSignalCount);
      
      // Count high priority signals
      let highPriorityCount = 0;
      
      // Play appropriate sound based on signal type and priority
      newSignals.forEach((signal) => {
        const strength = parseInt(signal.strength);
        const isHighPriority = strength >= 7;
        
        if (isHighPriority) {
          highPriorityCount++;
          // Play sound for high priority signals
          if (signal.signalType === "BUY") {
            playNotification("buy");
          } else if (signal.signalType === "SELL") {
            playNotification("sell");
          }
        }
      });

      if (highPriorityCount > 0) {
        toast.success(`🔥 ${highPriorityCount} HIGH PRIORITY signal${highPriorityCount > 1 ? 's' : ''} detected! (Strength 7+)`, {
          duration: 5000,
        });
      } else {
        toast.info(`${newSignals.length} new trading signal${newSignals.length > 1 ? 's' : ''} detected!`);
      }
    }
    
    if (signals) {
      setLastSignalCount(signals.length);
    }
  }, [signals, lastSignalCount, playNotification]);

  // Auto-refresh signals from database every 5 minutes
  useEffect(() => {
    const fetchInterval = setInterval(() => {
      refetchSignals();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(fetchInterval);
  }, [refetchSignals]);

  // Auto-generate fresh signals every 15 minutes
  useEffect(() => {
    const autoGenerate = () => {
      console.log("[FOX TRADE MASTER™] Auto-generating fresh signals...");
      toast.info("🔄 Auto-refreshing market analysis...", { duration: 3000 });
      generateSignals.mutate();
    };

    const generateInterval = setInterval(autoGenerate, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(generateInterval);
  }, []);

  const handleGenerateSignals = () => {
    generateSignals.mutate();
  };

  // Filter signals by market status and search query
  const filterSignals = (signalList: typeof signals) => {
    if (!signalList) return signalList;
    
    let filtered = signalList;
    
    // Filter by market status
    if (hideClosedMarkets && marketStatuses) {
      filtered = filtered.filter(signal => {
        const status = marketStatuses[signal.pair];
        return status && status.isOpen;
      });
    }
    
    // Filter by search query (Pro feature)
    if (isPro && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(signal => 
        signal.pair.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Use localSignals (from generateAll response) when DB signals are empty or not yet loaded
  const displaySignals = (signals && signals.length > 0) ? signals : (localSignals ?? undefined);
  const filteredSignals = filterSignals(displaySignals);
  const buySignals = filterSignals(displaySignals?.filter(s => s.signalType === "BUY")) || [];
  const sellSignals = filterSignals(displaySignals?.filter(s => s.signalType === "SELL")) || [];

  // Format last generated time as relative string
  const formatLastGenerated = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          {/* Desktop: Two-row layout */}
          <div className="hidden lg:block">
            {/* Row 1: Logo, Status, Audio */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
                  🦊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      FOX TRADE MASTER™
                    </h1>
                    {currentTier === 'pro' ? (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <Crown className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    ) : currentTier === 'premium' ? (
                      <Badge className="bg-orange-500 text-white">PREMIUM</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">FREE</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Advanced Forex Trading Signals • {availablePairs} Pair{availablePairs > 1 ? 's' : ''}
                    </p>
                    {/* Active Signal Count Badge */}
                    {signalStats && signalStats.activeCount > 0 && (
                      <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">
                        <Activity className="h-3 w-3 mr-1" />
                        {signalStats.activeCount} Active Signal{signalStats.activeCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {/* Streak Badge */}
                    {signalStats && signalStats.streakDays > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs px-2 py-0.5">
                        <Flame className="h-3 w-3 mr-1" />
                        {signalStats.streakDays} Day Streak
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
              {/* Auto-Refresh Status */}
              <div className="text-xs text-muted-foreground flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Auto-refresh: ON</span>
                </div>
                <div className="text-[10px] mt-0.5">Fetch: 5min | Generate: 15min</div>
              </div>

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
              </div>
            </div>

            {/* Row 2: Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 max-w-full px-2">
              {/* Generate Signals button with Last Generated timestamp below */}
              <div className="flex flex-col items-center gap-0.5">
                <Button
                  onClick={handleGenerateSignals}
                  disabled={generateSignals.isPending}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 md:text-sm lg:text-base px-3 md:px-4 py-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generateSignals.isPending ? "animate-spin" : ""}`} />
                  Generate Signals
                </Button>
                {signalStats?.lastGeneratedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Last: {formatLastGenerated(signalStats.lastGeneratedAt)}
                  </span>
                )}
              </div>

              {/* VPS Button */}
              <Button
                onClick={() => window.open('https://www.forexvps.net/?aff=110088', '_blank')}
                variant="outline"
                className="border-2 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <span className="mr-2 text-lg">🖥️</span>
                VPS
              </Button>

              {/* Mastering Forex Signals Book Button */}
              <Button
                onClick={() => window.open('https://read.amazon.com/sample/B0FWZL9Z72?clientId=share', '_blank')}
                variant="outline"
                className="border-2 border-green-500 text-green-700 hover:bg-green-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <span className="mr-2 text-lg">📚</span>
                Mastering Forex Signals Book
              </Button>

              {/* Signal History Button */}
              <Button
                onClick={() => window.location.href = "/history"}
                variant="outline"
                className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Signal History
              </Button>

              {/* Alert Settings Button */}
              <Button
                onClick={() => window.location.href = "/settings/alerts"}
                variant="outline"
                className="border-2 border-purple-500 text-purple-700 hover:bg-purple-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <Bell className="h-4 w-4 mr-2" />
                Alert Settings
              </Button>

              {/* Trade Journal Button */}
              <Button
                onClick={() => window.location.href = "/journal"}
                variant="outline"
                className="border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Trade Journal
              </Button>

              {/* Analytics Button */}
              <Button
                onClick={() => window.location.href = "/analytics"}
                variant="outline"
                className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>

              {/* AI Brain Button */}
              <Button
                onClick={() => window.location.href = "/ai-brain"}
                variant="outline"
                className="border-2 border-purple-600 text-purple-700 hover:bg-purple-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Brain
              </Button>

              {/* Refer a Friend Button */}
              <Button
                onClick={() => window.location.href = "/referral"}
                variant="outline"
                className="border-2 border-orange-400 text-orange-600 hover:bg-orange-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
              >
                🦊 Refer a Friend
              </Button>

              {/* Admin Button (only for admins) */}
              {user?.role === 'admin' && (
                <Button
                  onClick={() => window.location.href = "/admin"}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 md:text-sm lg:text-base px-3 md:px-4 py-2"
                >
                  ⚙️ Admin
                </Button>
              )}

              {/* Upgrade Buttons */}
              <div className="flex items-center gap-2">
                {currentTier === 'free' && (
                  <Button
                    onClick={() => window.location.href = "/premium"}
                    variant="outline"
                    size="lg"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    🔒 Upgrade to Premium
                  </Button>
                )}
                {currentTier === 'premium' && (
                  <Button
                    onClick={() => window.location.href = "/premium"}
                    variant="outline"
                    size="lg"
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Stacked layout */}
          <div className="lg:hidden space-y-3">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                🦊
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    FOX TRADE MASTER™
                  </h1>
                  {currentTier === 'pro' ? (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                      <Crown className="h-2 w-2 mr-1" />
                      PRO
                    </Badge>
                  ) : currentTier === 'premium' ? (
                    <Badge className="bg-orange-500 text-white text-xs">PREMIUM</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600 text-xs">FREE</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {availablePairs} Pair{availablePairs > 1 ? 's' : ''}
                  </p>
                  {signalStats && signalStats.activeCount > 0 && (
                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                      <Activity className="h-2.5 w-2.5 mr-0.5" />
                      {signalStats.activeCount} Active
                    </Badge>
                  )}
                  {signalStats && signalStats.streakDays > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-400 text-[10px] px-1.5 py-0">
                      <Flame className="h-2.5 w-2.5 mr-0.5" />
                      {signalStats.streakDays}d Streak
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-Refresh Status & Last Updated */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-muted-foreground">Auto-refresh: ON</span>
              </div>
              {lastUpdated && (
                <span className="text-muted-foreground">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Audio Controls */}
            <Card className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="audio-enabled-mobile"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                  <Label htmlFor="audio-enabled-mobile" className="flex items-center gap-1 cursor-pointer text-sm">
                    {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    Alerts
                  </Label>
                </div>
                {enabled && (
                  <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                    <Slider
                      value={[volume * 100]}
                      onValueChange={([val]) => setVolume(val / 100)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Generate Signals Button */}
            <div className="space-y-0.5">
              <Button
                onClick={handleGenerateSignals}
                disabled={generateSignals.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateSignals.isPending ? "animate-spin" : ""}`} />
                Generate Signals
              </Button>
              {signalStats?.lastGeneratedAt && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Last generated: {formatLastGenerated(signalStats.lastGeneratedAt)}
                </p>
              )}
            </div>

            {/* VPS and Book Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => window.open('https://www.forexvps.net/?aff=110088', '_blank')}
                variant="outline"
                className="border-2"
              >
                <span className="mr-2 text-lg">🖥️</span>
                VPS
              </Button>
              <Button
                onClick={() => window.open('https://read.amazon.com/sample/B0FWZL9Z72?clientId=share', '_blank')}
                variant="outline"
                className="border-2 border-green-500 text-green-700 hover:bg-green-50"
              >
                <span className="mr-1 text-lg">📚</span>
                Book
              </Button>
            </div>

            {/* Signal History Button */}
            <Button
              onClick={() => window.location.href = "/history"}
              variant="outline"
              className="w-full border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Signal History
            </Button>

            {/* AI Brain Button (mobile) */}
            <Button
              onClick={() => window.location.href = "/ai-brain"}
              variant="outline"
              className="w-full border-2 border-purple-600 text-purple-700 hover:bg-purple-50"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Brain
            </Button>

            {/* Refer a Friend Button (mobile) */}
            <Button
              onClick={() => window.location.href = "/referral"}
              variant="outline"
              className="w-full border-2 border-orange-400 text-orange-600 hover:bg-orange-50"
            >
              🦊 Refer a Friend
            </Button>

            {/* Alert Settings, Trade Journal, and Analytics Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => window.location.href = "/settings/alerts"}
                variant="outline"
                className="border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => window.location.href = "/journal"}
                variant="outline"
                className="border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-50"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => window.location.href = "/analytics"}
                variant="outline"
                className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Admin Button (mobile, only for admins) */}
            {user?.role === 'admin' && (
              <Button
                onClick={() => window.location.href = "/admin"}
                variant="outline"
                className="w-full border-red-500 text-red-600 hover:bg-red-50"
              >
                ⚙️ Admin Dashboard
              </Button>
            )}

            {/* Upgrade Buttons */}
            {currentTier === 'free' && (
              <Button
                onClick={() => window.location.href = "/premium"}
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                🔒 Upgrade to Premium
              </Button>
            )}
            {currentTier === 'premium' && (
              <Button
                onClick={() => window.location.href = "/premium"}
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro (156 Pairs)
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Expiry Warning Banner */}
        {subscriptionStatus && (subscriptionStatus.daysUntilExpiry !== undefined || subscriptionStatus.isExpired) && (
          <ExpiryBanner
            daysUntilExpiry={subscriptionStatus.daysUntilExpiry ?? null}
            isExpired={subscriptionStatus.isExpired || false}
            onRenew={() => window.location.href = "/premium"}
          />
        )}

        {/* AI Insights Panel */}
        <AIInsightsPanel />

        {/* Performance Stats (only for premium users) */}
        {isPremium && <PerformanceStats />}
        
        {/* Performance Chart (only for premium users) */}
        {isPremium && <PerformanceChart />}

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
                FOX TRADE MASTER™ proprietary session-based momentum analysis - Optimal trading windows based on market sessions and volatility patterns
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

        {/* Pro Search Bar */}
        {isPro && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-purple-600" />
                <input
                  type="text"
                  placeholder="Search currency pairs (e.g., EUR/USD, GBP, JPY)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-purple-600"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-purple-600 mt-2">
                <Crown className="h-3 w-3 inline mr-1" />
                Pro feature: Search across all 156 currency pairs
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trading Signals */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">
              All Signals ({displaySignals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="buy" className="text-green-600">
              BUY ({buySignals.length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-red-600">
              SELL ({sellSignals.length})
            </TabsTrigger>
          </TabsList>

            {/* Market Filter Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="hide-closed"
                checked={hideClosedMarkets}
                onCheckedChange={setHideClosedMarkets}
              />
              <Label htmlFor="hide-closed" className="flex items-center gap-2 cursor-pointer text-sm">
                <Filter className="h-4 w-4" />
                Hide Closed Markets
              </Label>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            {/* Signal of the Day Banner */}
            <SignalOfTheDayBanner />
            {signalsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-orange-500" />
                <p className="mt-4 text-muted-foreground">Loading signals...</p>
              </div>
            ) : filteredSignals && filteredSignals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSignals.map((signal) => (
                  <SignalCard 
                    key={signal.id} 
                    signal={{ 
                      ...signal, 
                      reasoning: signal.reason,
                      aiReasoning: signal.aiReasoning,
                      aiConfidence: signal.aiConfidence,
                      aiKeyFactors: signal.aiKeyFactors,
                      aiInsight: signal.aiInsight,
                      isAiGenerated: signal.isAiGenerated,
                      currentPrice: signal.currentPrice ?? null,
                      plDollars: signal.plDollars ?? null,
                    }} 
                    isPremium={isPremium}
                  />
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
                  <SignalCard 
                    key={signal.id} 
                    signal={{ 
                      ...signal, 
                      reasoning: signal.reason,
                      aiReasoning: signal.aiReasoning,
                      aiConfidence: signal.aiConfidence,
                      aiKeyFactors: signal.aiKeyFactors,
                      aiInsight: signal.aiInsight,
                      isAiGenerated: signal.isAiGenerated,
                      currentPrice: signal.currentPrice ?? null,
                      plDollars: signal.plDollars ?? null,
                    }} 
                    isPremium={isPremium}
                  />
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
                  <SignalCard 
                    key={signal.id} 
                    signal={{ 
                      ...signal, 
                      reasoning: signal.reason,
                      aiReasoning: signal.aiReasoning,
                      aiConfidence: signal.aiConfidence,
                      aiKeyFactors: signal.aiKeyFactors,
                      aiInsight: signal.aiInsight,
                      isAiGenerated: signal.isAiGenerated,
                      currentPrice: signal.currentPrice ?? null,
                      plDollars: signal.plDollars ?? null,
                    }} 
                    isPremium={isPremium}
                  />
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

      {/* Legal Disclaimer */}
      <div className="container py-8 mt-12 border-t">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            <strong>Legal Disclaimer:</strong> Please be advised that there are no guarantees of profit, 
            as past performance is not indicative of future results, and all trading involves significant risk. 
            Factors such as market volatility, the limitations of algorithms, and the potential for loss, can occur and bots are tools and not a substitute for user experience and decision-making. 
            The provider is not responsible for any financial losses and the Fox Trade Master bot is provided "as is" without warranties, all users should perform their own research and manage their own risk.
          </p>
        </div>
      </div>
    </div>
  );
}

