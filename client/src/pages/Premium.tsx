import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Check, Lock, Sparkles, Loader2, Crown, Star } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Premium() {
  const [, setLocation] = useLocation();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  
  const { data: subscriptionStatus } = trpc.subscription.getStatus.useQuery();
  
  const createPaymentMutation = trpc.subscription.createPayment.useMutation({
    onSuccess: (data) => {
      if (data.approvalUrl) {
        // Redirect to PayPal for payment
        window.location.href = data.approvalUrl;
      } else {
        toast.error("Payment URL not available");
        setProcessingPlan(null);
      }
    },
    onError: (error) => {
      toast.error("Failed to initiate payment: " + error.message);
      setProcessingPlan(null);
    },
  });

  const handleUpgrade = (plan: "monthly" | "yearly" | "pro_monthly" | "pro_yearly") => {
    if (!isAuthenticated) {
      toast.error("Please login first to purchase subscription");
      setTimeout(() => {
        window.location.href = getLoginUrl();
      }, 1500);
      return;
    }
    setProcessingPlan(plan);
    toast.info("Redirecting to PayPal...");
    createPaymentMutation.mutate({ plan });
  };

  // Show different message for active users
  const currentTier = subscriptionStatus?.tier || 'free';
  const isActive = subscriptionStatus?.isActive && !subscriptionStatus?.isExpired;
  
  if (isActive && currentTier !== 'free') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              {currentTier === 'pro' ? (
                <Crown className="h-6 w-6 text-purple-500" />
              ) : (
                <Sparkles className="h-6 w-6 text-orange-500" />
              )}
              <CardTitle>
                {currentTier === 'pro' ? 'Pro Member!' : 'Premium Member!'}
              </CardTitle>
            </div>
            <CardDescription>
              You have an active {currentTier} subscription.
              {subscriptionStatus.expiry && (
                <span className="block mt-2">
                  Expires: {new Date(subscriptionStatus.expiry).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Dashboard
            </Button>
            {currentTier === 'premium' && (
              <Button 
                onClick={() => setLocation("/premium")} 
                variant="outline"
                className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Pro (156 Pairs)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Determine if this is a renewal or new subscription
  const isRenewal = subscriptionStatus?.isExpired || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 py-12 px-4">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
              🦊
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
              FOX TRADE MASTER™
            </h1>
          </div>
          <h2 className="text-2xl font-bold mb-2">Choose Your Trading Plan</h2>
          <p className="text-muted-foreground">
            From 1 pair to 156 pairs - unlock the signals you need
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* FREE TIER */}
          <Card className="relative border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-xl">Free</CardTitle>
              </div>
              <CardDescription>Try our signals</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 min-h-[280px]">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>1 currency pair</strong> (EUR/USD)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full signal details</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>4 trading strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Real-time alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Auto-refresh</span>
                </li>
              </ul>
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* PREMIUM TIER */}
          <Card className="relative border-2 border-orange-500 shadow-lg scale-105">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500">
              MOST POPULAR
            </Badge>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-xl">Premium</CardTitle>
              </div>
              <CardDescription>Major currency pairs</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$99.95</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 min-h-[280px]">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>10 currency pairs</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>All major pairs (EUR, GBP, USD, JPY, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full signal details</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>4 advanced strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>24-hour momentum analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Real-time audio & visual alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Auto-refresh every 15 minutes</span>
                </li>
              </ul>
              <div className="space-y-3">
                <Button
                  onClick={() => handleUpgrade("monthly")}
                  disabled={processingPlan !== null}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
                >
                  {processingPlan === "monthly" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isRenewal ? "Renew Monthly" : "Subscribe Monthly"
                  )}
                </Button>
                <Button
                  onClick={() => handleUpgrade("yearly")}
                  disabled={processingPlan !== null}
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold"
                >
                  {processingPlan === "yearly" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Yearly $1,000 (Save $199)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PRO TIER */}
          <Card className="relative border-2 border-purple-500 shadow-xl">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500">
              PROFESSIONAL
            </Badge>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-xl">Pro</CardTitle>
              </div>
              <CardDescription>Complete market access</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 min-h-[280px]">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong className="text-purple-600">156 currency pairs</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>28 major + 38 minor + 90 exotic pairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Advanced search & filtering</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>All Premium features</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Complete global market coverage</span>
                </li>
                <li className="flex items-start gap-2">
                  <Crown className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-purple-600">Professional trader toolkit</span>
                </li>
              </ul>
              <div className="space-y-3">
                <Button
                  onClick={() => handleUpgrade("pro_monthly")}
                  disabled={processingPlan !== null}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                >
                  {processingPlan === "pro_monthly" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      {isRenewal ? "Renew Pro Monthly" : "Subscribe Pro Monthly"}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleUpgrade("pro_yearly")}
                  disabled={processingPlan !== null}
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold"
                >
                  {processingPlan === "pro_yearly" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Yearly $2,500 (Save $1,088)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>See what's included in each plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4">Free</th>
                    <th className="text-center py-3 px-4 bg-orange-50">Premium</th>
                    <th className="text-center py-3 px-4 bg-purple-50">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Currency Pairs</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4 bg-orange-50 font-semibold">10</td>
                    <td className="text-center py-3 px-4 bg-purple-50 font-semibold text-purple-600">156</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Trading Strategies</td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-orange-50"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-purple-50"><Check className="h-5 w-5 mx-auto text-purple-600" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Full Signal Details</td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-orange-50"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-purple-50"><Check className="h-5 w-5 mx-auto text-purple-600" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Real-time Alerts</td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-orange-50"><Check className="h-5 w-5 mx-auto text-green-600" /></td>
                    <td className="text-center py-3 px-4 bg-purple-50"><Check className="h-5 w-5 mx-auto text-purple-600" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Advanced Search</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-orange-50">-</td>
                    <td className="text-center py-3 px-4 bg-purple-50"><Check className="h-5 w-5 mx-auto text-purple-600" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Exotic Pairs</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 bg-orange-50">-</td>
                    <td className="text-center py-3 px-4 bg-purple-50"><Check className="h-5 w-5 mx-auto text-purple-600" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
