import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Target, Shield, Clock, ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function ShareSignal() {
  const [, params] = useRoute("/share/:shareId");
  const shareId = params?.shareId || "";

  const { data: signal, isLoading, error } = trpc.sharing.getSharedSignal.useQuery(
    { shareId },
    { enabled: !!shareId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading signal...</p>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 mx-auto mb-4" />
            <CardTitle>Signal Not Found</CardTitle>
            <CardDescription>
              This signal link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBuy = signal.signalType === "BUY";
  const SignalIcon = isBuy ? TrendingUp : TrendingDown;
  const signalColor = isBuy ? "text-green-600" : "text-red-600";
  const bgColor = isBuy ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10" />
              <div>
                <h1 className="text-lg font-bold">{APP_TITLE}</h1>
                <p className="text-xs text-muted-foreground">Shared Trading Signal</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Signal Card */}
        <Card className={`${bgColor} border-2`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-lg bg-white dark:bg-slate-800 ${signalColor}`}>
                  <SignalIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{signal.pair}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className={`font-bold ${signalColor}`}>{signal.signalType}</span>
                    <span>•</span>
                    <span className="capitalize">{signal.strategy} Strategy</span>
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Strength</div>
                <div className="text-2xl font-bold text-orange-600">{signal.strength}/10</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Price Levels */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800">
                <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                <div className="font-bold text-lg">{signal.entryPrice}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-xs text-muted-foreground mb-1">Take Profit</div>
                <div className="font-bold text-lg text-green-600">{signal.takeProfit}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                <div className="font-bold text-lg text-red-600">{signal.stopLoss}</div>
              </div>
            </div>

            {/* Signal Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Timeframe:</span>
                <span className="font-medium">{signal.timeframe}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="font-medium mt-1">{signal.reason}</p>
                </div>
              </div>
            </div>

            {/* Indicators */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Technical Indicators</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {JSON.parse(signal.indicators).join(" • ")}
              </div>
            </div>

            {/* View Count */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              This signal has been viewed {signal.viewCount || 0} times
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mt-6">
          <CardHeader className="text-center">
            <CardTitle>Want More Signals Like This?</CardTitle>
            <CardDescription>
              Get access to advanced forex trading signals with {APP_TITLE}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/premium">Upgrade to Premium</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">View Free Signals</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
