import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

interface ExpiryBannerProps {
  daysUntilExpiry: number | null;
  isExpired: boolean;
  onRenew: () => void;
}

export function ExpiryBanner({ daysUntilExpiry, isExpired, onRenew }: ExpiryBannerProps) {
  // Don't show banner if no expiry info
  if (daysUntilExpiry === null && !isExpired) {
    return null;
  }

  // Expired subscription
  if (isExpired) {
    return (
      <Alert variant="destructive" className="border-2">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Subscription Expired</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            Your premium subscription has expired. Renew now to regain access to all 10 currency pairs and full signal details.
          </span>
          <Button 
            onClick={onRenew}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shrink-0"
          >
            Renew Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Expiring soon (7 days or less)
  if (daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    return (
      <Alert className="border-2 border-orange-500 bg-orange-50">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-lg font-bold text-orange-900">
          Subscription Expiring Soon
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-orange-800">
            <Clock className="h-4 w-4 inline mr-1" />
            Your premium subscription expires in <strong>{daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</strong>. 
            Renew now to avoid losing access.
          </span>
          <Button 
            onClick={onRenew}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-100 shrink-0"
          >
            Renew Early
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

