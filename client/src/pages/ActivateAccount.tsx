import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, AlertCircle, TrendingUp, Shield, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ActivateAccount() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"premium" | "pro" | "login">("login");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const tierParam = params.get("tier");
    const modeParam = params.get("mode");

    if (planParam === "pro_monthly" || planParam === "pro_yearly") {
      setTier("pro");
    } else if (planParam === "monthly" || planParam === "yearly") {
      setTier("premium");
    }

    if (tierParam === "premium" || tierParam === "pro") {
      setTier(tierParam);
    }

    if (modeParam === "login") {
      setTier("login");
    }
  }, []);

  const requestMagicLink = trpc.auth.requestMagicLink.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      toast.error(`Failed to send link: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    const effectiveTier = tier === "login" ? "premium" : tier;
    requestMagicLink.mutate({ email, tier: effectiveTier });
  };

  const isLogin = tier === "login";
  const tierName = tier === "pro" ? "Pro" : "Premium";

  // ── Success screen ──────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🦊</span>
            </div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              FOX TRADE MASTER™
            </h1>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <CardContent className="pt-8 pb-6 space-y-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Check Your Email!</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  We've sent a secure login link to <strong>{email}</strong>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                <p className="text-sm font-semibold text-blue-900 mb-2">Next steps:</p>
                <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
                  <li>Open your email inbox</li>
                  <li>Click the secure link we sent you</li>
                  <li>You'll be automatically logged in</li>
                  <li>Start trading with AI-powered signals!</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold">Didn't receive it?</p>
                    <p className="mt-1 text-amber-800">Check your spam folder · Wait 1-2 minutes · Verify your email address</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full">
                Try a Different Email
              </Button>
              <Button asChild variant="ghost" className="w-full text-muted-foreground text-sm">
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-4xl">🦊</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              FOX TRADE MASTER™
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Advanced AI-Powered Forex Trading Signals
            </p>
          </div>
          {/* Trust badges */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
              <Brain className="h-3 w-3 mr-1" /> AI Enhanced
            </Badge>
            <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
              <TrendingUp className="h-3 w-3 mr-1" /> 156 Pairs
            </Badge>
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              <Shield className="h-3 w-3 mr-1" /> Secure Login
            </Badge>
          </div>
        </div>

        {/* Form card */}
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="pt-6 pb-6 space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {isLogin ? "Welcome Back" : `Activate Your ${tierName} Account`}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin
                  ? "Enter your email to receive a secure login link"
                  : "Enter your email to activate your account and start trading"}
              </p>
            </div>

            {/* Benefits (only for new activations) */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Zap className="h-3.5 w-3.5" />, text: tier === "pro" ? "156 currency pairs" : "10 currency pairs" },
                  { icon: <Brain className="h-3.5 w-3.5" />, text: "AI-powered signals" },
                  { icon: <TrendingUp className="h-3.5 w-3.5" />, text: "Real-time alerts" },
                  { icon: <Shield className="h-3.5 w-3.5" />, text: "Trade journal" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-3 py-2 text-xs text-orange-800 font-medium">
                    <span className="text-orange-600">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send you a one-click secure login link — no password needed
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 font-semibold text-base shadow-md"
                disabled={requestMagicLink.isPending}
              >
                {requestMagicLink.isPending
                  ? "Sending..."
                  : isLogin
                  ? "Send Login Link"
                  : `Activate ${tierName} Account`}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground bg-white px-2">
                or
              </div>
            </div>

            <div className="space-y-2">
              {isLogin ? (
                <Button asChild variant="outline" className="w-full text-sm">
                  <Link href="/premium">Don't have an account? View Plans</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => setTier("login")}
                >
                  Already have an account? Login instead
                </Button>
              )}
              <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground">
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground px-4">
          By continuing, you agree to receive trading signals and account updates from FOX TRADE MASTER™.
          Trading involves risk — past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
