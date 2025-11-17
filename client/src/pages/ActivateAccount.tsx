import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ActivateAccount() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"premium" | "pro">("premium");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get tier from URL params
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier");
    if (tierParam === "premium" || tierParam === "pro") {
      setTier(tierParam);
    }
  });

  const requestMagicLink = trpc.auth.requestMagicLink.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Magic link sent! Check your email.");
    },
    onError: (error) => {
      toast.error(`Failed to send magic link: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    requestMagicLink.mutate({ email, tier });
  };

  const tierName = tier === "premium" ? "Premium" : "Pro";
  const tierFeatures = tier === "premium" ? "10 currency pairs" : "156 currency pairs";

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check Your Email!</CardTitle>
            <CardDescription>
              We've sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Check your email inbox for "{tierName} Activation"</li>
                <li>Click the activation link in the email</li>
                <li>You'll be automatically logged in</li>
                <li>Start receiving {tierFeatures} signals!</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium">Didn't receive the email?</p>
                  <ul className="mt-1 space-y-1 text-yellow-800">
                    <li>• Check your spam/junk folder</li>
                    <li>• Wait a few minutes for delivery</li>
                    <li>• Make sure you entered the correct email</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="w-full"
            >
              Use Different Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🦊</span>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            FOX TRADE MASTER™
          </CardTitle>
          <CardDescription className="text-lg">
            Activate Your {tierName} Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Your {tierName} Benefits:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✅ {tierFeatures}</li>
                <li>✅ Full signal details</li>
                <li>✅ 4 trading strategies</li>
                <li>✅ Real-time alerts</li>
                <li>✅ 24-hour momentum analysis</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send you a secure login link
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              disabled={requestMagicLink.isPending}
            >
              {requestMagicLink.isPending ? "Sending..." : "Send Activation Link"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By activating, you agree to receive trading signals and account updates
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
