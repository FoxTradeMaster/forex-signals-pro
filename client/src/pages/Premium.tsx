import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, Lock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Premium() {
  const [, setLocation] = useLocation();
  const [processingPlan, setProcessingPlan] = useState<"monthly" | "yearly" | null>(null);
  
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

  const handleUpgrade = (plan: "monthly" | "yearly") => {
    setProcessingPlan(plan);
    toast.info("Redirecting to PayPal...");
    createPaymentMutation.mutate({ plan });
  };

  if (subscriptionStatus?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-orange-500" />
              <CardTitle>You're Premium!</CardTitle>
            </div>
            <CardDescription>
              You have full access to all FOX TRADE MASTER features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
              🦊
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              FOX TRADE MASTER
            </h1>
          </div>
          <h2 className="text-2xl font-bold mb-2">Unlock Premium Trading Signals</h2>
          <p className="text-muted-foreground">
            Get full access to all 10 currency pairs and advanced trading strategies
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Monthly Plan */}
          <Card className="relative border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Monthly</CardTitle>
              <CardDescription>Perfect for trying premium features</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$99.95</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>All 10 currency pairs unlocked</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full signal details (Entry, Stop Loss, Take Profit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>4 advanced trading strategies</span>
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
              <Button 
                onClick={() => handleUpgrade("monthly")}
                disabled={processingPlan !== null}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                size="lg"
              >
                {processingPlan === "monthly" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Monthly"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative border-2 border-orange-500 shadow-lg">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500">
              BEST VALUE - Save $199
            </Badge>
            <CardHeader>
              <CardTitle className="text-2xl">Yearly</CardTitle>
              <CardDescription>Save 17% with annual billing</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$1,000</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-green-600 font-semibold">
                Just $83.33/month - Save $199 per year!
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>All 10 currency pairs unlocked</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full signal details (Entry, Stop Loss, Take Profit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>4 advanced trading strategies</span>
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
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-orange-600">2 months FREE</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade("yearly")}
                disabled={processingPlan !== null}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                size="lg"
              >
                {processingPlan === "yearly" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Yearly"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Free Tier Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Free Tier</CardTitle>
            </div>
            <CardDescription>
              Currently, you have access to EUR/USD signals only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The free tier gives you full access to EUR/USD trading signals so you can see how our system works.
              Upgrade to Premium to unlock all 9 additional currency pairs with complete signal details.
            </p>
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

