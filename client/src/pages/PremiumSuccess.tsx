import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PremiumSuccess() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("");

  const orderId = searchParams.get("token"); // PayPal returns order ID as 'token'
  const plan = (searchParams.get("plan") || "monthly") as "monthly" | "yearly";

  const capturePayment = trpc.subscription.capturePayment.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message);
      toast.success("🎉 Premium activated!");
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message);
      toast.error("Payment failed");
    },
  });

  useEffect(() => {
    if (orderId) {
      // Capture the payment
      capturePayment.mutate({ orderId, plan });
    } else {
      setStatus("error");
      setMessage("No payment information found");
    }
  }, [orderId, plan]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            {status === "processing" && (
              <>
                <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
                <CardTitle>Processing Payment...</CardTitle>
                <CardDescription>Please wait while we confirm your payment</CardDescription>
              </>
            )}
            
            {status === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>Your premium subscription is now active</CardDescription>
              </>
            )}
            
            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-500" />
                <CardTitle>Payment Failed</CardTitle>
                <CardDescription>There was an issue processing your payment</CardDescription>
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {message && (
            <p className="text-center text-sm text-muted-foreground">{message}</p>
          )}
          
          {status === "success" && (
            <div className="text-center text-sm text-muted-foreground">
              Redirecting to dashboard in 3 seconds...
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-2">
              <Button 
                onClick={() => setLocation("/premium")} 
                className="w-full"
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => setLocation("/")} 
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

