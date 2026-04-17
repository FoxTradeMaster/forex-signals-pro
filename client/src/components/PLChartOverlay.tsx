import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Target, ShieldAlert, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface PLChartOverlayProps {
  open: boolean;
  onClose: () => void;
  signal: {
    pair: string;
    signalType: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit: string;
    createdAt?: string | Date;
  };
  currentPrice: number;
  plDollars: number;
  plPips: number;
}

/**
 * Mini chart overlay showing:
 *  - A faint 24h hourly sparkline (real Polygon data)
 *  - Horizontal dashed lines for Entry, TP, SL, and Current price
 *  - A progress bar toward Take Profit
 */
export function PLChartOverlay({
  open,
  onClose,
  signal,
  currentPrice,
  plDollars,
  plPips,
}: PLChartOverlayProps) {
  const entry = parseFloat(signal.entryPrice);
  const tp = parseFloat(signal.takeProfit);
  const sl = parseFloat(signal.stopLoss);
  const isBuy = signal.signalType === "BUY";
  const isProfit = plDollars >= 0;

  // Fetch 24h price history only when the dialog is open
  const { data: history = [], isLoading: historyLoading } =
    trpc.market.getPriceHistory.useQuery(
      { pair: signal.pair, hours: 24 },
      { enabled: open, staleTime: 5 * 60 * 1000 }
    );

  // SVG dimensions
  const W = 320;
  const H = 220;
  const PAD_LEFT = 72;
  const PAD_RIGHT = 28;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 20;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const chartW = W - PAD_LEFT - PAD_RIGHT;

  // Combine all prices to determine y-axis range
  const historyPrices = history.map((d) => d.c);
  const allPrices = [entry, tp, sl, currentPrice, ...historyPrices];
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 0.0001;
  const padded = range * 0.25;
  const lo = minP - padded;
  const hi = maxP + padded;

  // Map a price to a Y coordinate (top = high price)
  const toY = (price: number) =>
    PAD_TOP + chartH - ((price - lo) / (hi - lo)) * chartH;

  const yEntry = toY(entry);
  const yTP = toY(tp);
  const ySL = toY(sl);
  const yCurrent = toY(currentPrice);

  // Build SVG polyline points for the 24h sparkline
  const sparklinePoints =
    history.length >= 2
      ? history
          .map((d, i) => {
            const x = PAD_LEFT + (i / (history.length - 1)) * chartW;
            const y = toY(d.c);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";

  // Calculate the X position of the signal creation timestamp on the sparkline
  // The sparkline spans the last 24h; we map the signal's createdAt to that range
  const signalCreationX: number | null = (() => {
    if (!signal.createdAt || history.length < 2) return null;
    const createdMs = new Date(signal.createdAt).getTime();
    const firstMs = history[0].t;
    const lastMs = history[history.length - 1].t;
    if (createdMs < firstMs || createdMs > lastMs) return null; // outside visible range
    const ratio = (createdMs - firstMs) / (lastMs - firstMs);
    return PAD_LEFT + ratio * chartW;
  })();

  // Profit / loss zone bands
  const profitZoneTop = Math.min(yEntry, yTP);
  const profitZoneH = Math.abs(yEntry - yTP);
  const lossZoneTop = Math.min(yEntry, ySL);
  const lossZoneH = Math.abs(yEntry - ySL);

  const formatPrice = (p: number) =>
    signal.pair.includes("JPY") ? p.toFixed(3) : p.toFixed(5);

  const formatPL = (val: number, suffix: string) => {
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(suffix === "$" ? 2 : 1)} ${suffix}`;
  };

  const progressToTP = isBuy
    ? Math.max(0, Math.min(100, ((currentPrice - entry) / (tp - entry)) * 100))
    : Math.max(0, Math.min(100, ((entry - currentPrice) / (entry - tp)) * 100));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="font-bold text-lg">{signal.pair}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isBuy
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {signal.signalType}
            </span>
            <span className="ml-auto text-sm font-semibold text-muted-foreground">
              Live P/L
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* P/L Summary Row */}
        <div
          className={`mx-5 mb-4 flex items-center justify-between px-4 py-3 rounded-xl ${
            isProfit
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-bold text-lg ${
                isProfit ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPL(plDollars, "$")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatPL(plPips, "pips")}
          </span>
        </div>

        {/* SVG Chart */}
        <div className="px-5 pb-2 relative">
          {historyLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
          >
            {/* Profit zone (green band) */}
            <rect
              x={PAD_LEFT}
              y={profitZoneTop}
              width={chartW}
              height={profitZoneH}
              fill="#22c55e"
              opacity={0.07}
            />
            {/* Loss zone (red band) */}
            <rect
              x={PAD_LEFT}
              y={lossZoneTop}
              width={chartW}
              height={lossZoneH}
              fill="#ef4444"
              opacity={0.07}
            />

            {/* 24h sparkline — rendered behind the level lines */}
            {sparklinePoints && (
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke={isProfit ? "#22c55e" : "#ef4444"}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* TP line */}
            <line
              x1={PAD_LEFT}
              y1={yTP}
              x2={W - PAD_RIGHT}
              y2={yTP}
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* SL line */}
            <line
              x1={PAD_LEFT}
              y1={ySL}
              x2={W - PAD_RIGHT}
              y2={ySL}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* Entry line */}
            <line
              x1={PAD_LEFT}
              y1={yEntry}
              x2={W - PAD_RIGHT}
              y2={yEntry}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* Current price line */}
            <line
              x1={PAD_LEFT}
              y1={yCurrent}
              x2={W - PAD_RIGHT}
              y2={yCurrent}
              stroke={isProfit ? "#16a34a" : "#dc2626"}
              strokeWidth={2}
            />

            {/* Current price dot at end of sparkline */}
            <circle
              cx={PAD_LEFT + chartW}
              cy={yCurrent}
              r={4}
              fill={isProfit ? "#16a34a" : "#dc2626"}
            />

            {/* Price labels (left axis) */}
            <text x={PAD_LEFT - 6} y={yTP + 4} textAnchor="end" fontSize={9} fill="#16a34a" fontWeight="600">
              {formatPrice(tp)}
            </text>
            <text x={PAD_LEFT - 6} y={ySL + 4} textAnchor="end" fontSize={9} fill="#dc2626" fontWeight="600">
              {formatPrice(sl)}
            </text>
            <text x={PAD_LEFT - 6} y={yEntry + 4} textAnchor="end" fontSize={9} fill="#6366f1" fontWeight="600">
              {formatPrice(entry)}
            </text>
            <text
              x={PAD_LEFT - 6}
              y={yCurrent + 4}
              textAnchor="end"
              fontSize={9}
              fill={isProfit ? "#16a34a" : "#dc2626"}
              fontWeight="700"
            >
              {formatPrice(currentPrice)}
            </text>

            {/* Right-side labels */}
            <text x={W - PAD_RIGHT + 4} y={yTP + 4} fontSize={8} fill="#16a34a" fontWeight="600">TP</text>
            <text x={W - PAD_RIGHT + 4} y={ySL + 4} fontSize={8} fill="#dc2626" fontWeight="600">SL</text>
            <text x={W - PAD_RIGHT + 4} y={yEntry + 4} fontSize={8} fill="#6366f1" fontWeight="600">Entry</text>
            <text
              x={W - PAD_RIGHT + 4}
              y={yCurrent + 4}
              fontSize={8}
              fill={isProfit ? "#16a34a" : "#dc2626"}
              fontWeight="700"
            >
              Now
            </text>

            {/* Signal creation timestamp marker */}
            {signalCreationX !== null && (
              <>
                <line
                  x1={signalCreationX}
                  y1={PAD_TOP}
                  x2={signalCreationX}
                  y2={H - PAD_BOTTOM}
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  strokeOpacity={0.75}
                />
                <circle
                  cx={signalCreationX}
                  cy={PAD_TOP + 6}
                  r={3}
                  fill="#f97316"
                  opacity={0.85}
                />
                <text
                  x={signalCreationX + 4}
                  y={PAD_TOP + 10}
                  fontSize={7}
                  fill="#f97316"
                  fontWeight="600"
                >
                  Signal
                </text>
              </>
            )}

            {/* 24h label on sparkline (bottom-left) */}
            {sparklinePoints && (
              <text x={PAD_LEFT + 2} y={H - 4} fontSize={8} fill="#94a3b8">
                24h
              </text>
            )}
          </svg>
        </div>

        {/* Progress bar toward TP */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3 text-green-600" />
              Progress to Take Profit
            </span>
            <span className="font-semibold">{progressToTP.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isProfit ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.max(2, progressToTP)}%` }}
            />
          </div>

          {/* Key levels legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-indigo-500" />
              <span className="text-muted-foreground">Entry: {formatPrice(entry)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-green-500" />
              <span className="text-muted-foreground">TP: {formatPrice(tp)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">SL: {formatPrice(sl)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-0.5 ${isProfit ? "bg-green-600" : "bg-red-600"}`} />
              <span className="text-muted-foreground">Now: {formatPrice(currentPrice)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
