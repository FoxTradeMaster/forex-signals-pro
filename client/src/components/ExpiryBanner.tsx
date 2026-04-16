import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, XCircle, RefreshCw } from "lucide-react";

interface ExpiryBannerProps {
  daysUntilExpiry: number | null;
  isExpired: boolean;
  onRenew: () => void;
}

export function ExpiryBanner({ daysUntilExpiry, isExpired, onRenew }: ExpiryBannerProps) {
  // Don't show banner if no expiry info or plenty of time left (> 30 days)
  if (daysUntilExpiry === null && !isExpired) return null;
  if (daysUntilExpiry !== null && daysUntilExpiry > 30 && !isExpired) return null;

  // Expired subscription — urgent red banner
  if (isExpired) {
    return (
      <Alert className="border-2 border-red-500 bg-red-950/40 text-red-100">
        <XCircle className="h-5 w-5 text-red-400" />
        <AlertTitle className="text-lg font-bold text-red-300">Subscription Expired</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <span className="text-red-200">
            Your premium subscription has expired. You are now on the free tier (EUR/USD only).
            Renew now to regain access to all pairs and full signal details.
          </span>
          <Button
            onClick={onRenew}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shrink-0 font-bold"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Renew Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // 7 days or less — urgent orange warning
  if (daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    return (
      <Alert className="border-2 border-orange-500 bg-orange-950/40">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        <AlertTitle className="text-lg font-bold text-orange-300">
          Subscription Expiring in {daysUntilExpiry} Day{daysUntilExpiry !== 1 ? "s" : ""}
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <span className="text-orange-200">
            <Clock className="h-4 w-4 inline mr-1" />
            Your premium access expires in <strong>{daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}</strong>.
            Renew now to avoid any interruption to your signals.
          </span>
          <Button
            onClick={onRenew}
            className="border-orange-500 bg-orange-500/20 hover:bg-orange-500/40 text-orange-200 border shrink-0"
          >
            Renew Early
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // 8–14 days — moderate yellow warning
  if (daysUntilExpiry !== null && daysUntilExpiry <= 14 && daysUntilExpiry > 7) {
    return (
      <Alert className="border border-yellow-600 bg-yellow-950/30">
        <Clock className="h-5 w-5 text-yellow-500" />
        <AlertTitle className="text-base font-semibold text-yellow-300">
          Subscription Expiring in {daysUntilExpiry} Days
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <span className="text-yellow-200 text-sm">
            Your premium subscription expires in {daysUntilExpiry} days. Consider renewing early to keep uninterrupted access.
          </span>
          <Button
            onClick={onRenew}
            variant="outline"
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/40 shrink-0 text-sm"
          >
            Renew Early
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // 15–30 days — soft blue info
  if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 14) {
    return (
      <Alert className="border border-blue-700 bg-blue-950/20">
        <Clock className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-sm font-medium text-blue-300">
          Subscription renews in {daysUntilExpiry} days
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-1">
          <span className="text-blue-300 text-sm">
            Your premium access is active. Renew early if you prefer to extend now.
          </span>
          <Button
            onClick={onRenew}
            variant="ghost"
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 shrink-0 text-sm h-8"
          >
            Renew Early
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

