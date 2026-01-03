import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Activity } from "lucide-react";

export type SignalStatus = "target_hit" | "stop_loss_hit" | "active";

interface SignalStatusBadgeProps {
  status: SignalStatus;
  currentPrice?: number;
  plDollars?: number;
}

export function SignalStatusBadge({ status, currentPrice, plDollars }: SignalStatusBadgeProps) {
  const statusConfig = {
    target_hit: {
      label: "Target Hit",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700 border-green-300",
    },
    stop_loss_hit: {
      label: "Stop Loss Hit",
      icon: XCircle,
      className: "bg-red-100 text-red-700 border-red-300",
    },
    active: {
      label: "Active",
      icon: Activity,
      className: "bg-blue-100 text-blue-700 border-blue-300",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1 px-2 py-1`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-semibold">{config.label}</span>
      {currentPrice && (
        <span className="text-xs ml-1">
          @ {currentPrice.toFixed(5)}
        </span>
      )}
      {plDollars !== undefined && (
        <span className={`text-xs ml-1 font-bold ${plDollars >= 0 ? "text-green-700" : "text-red-700"}`}>
          ({plDollars >= 0 ? "+" : ""}{plDollars.toFixed(2)})
        </span>
      )}
    </Badge>
  );
}
