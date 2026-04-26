import { useState, useCallback } from "react";
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
 *  - Hover tooltip showing price and time at cursor position
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

  // Hover tooltip state
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    price: number;
    time: string;
    svgX: number;
  } | null>(null);

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
  const PAD_BOTTOM = 32; // extra space for time axis labels
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
  const signalCreationX: number | null = (() => {
    if (!signal.createdAt || history.length < 2) return null;
    const createdMs = new Date(signal.createdAt).getTime();
    const firstMs = history[0].t;
    const lastMs = history[history.length - 1].t;
    if (createdMs < firstMs || createdMs > lastMs) return null;
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

  // Handle mouse move over the SVG chart area for tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (history.length < 2) return;
      const rect = e.currentTarget.getBoundingClientRect();
      // Compute position relative to the SVG element
      const svgEl = e.currentTarget.closest("svg");
      if (!svgEl) return;
      const svgRect = svgEl.getBoundingClientRect();
      const mouseX = e.clientX - svgRect.left;
      const mouseY = e.clientY - svgRect.top;

      // Map mouseX to chart coordinates
      const svgX = (mouseX / svgRect.width) * W;
      const chartRelX = svgX - PAD_LEFT;
      if (chartRelX < 0 || chartRelX > chartW) {
        setHoverInfo(null);
        return;
      }

      // Find the closest data point
      const ratio = chartRelX / chartW;
      const idx = Math.round(ratio * (history.length - 1));
      const clampedIdx = Math.max(0, Math.min(history.length - 1, idx));
      const dataPoint = history[clampedIdx];

      const dotX = PAD_LEFT + (clampedIdx / (history.length - 1)) * chartW;
      const dotY = toY(dataPoint.c);

      const timeStr = new Date(dataPoint.t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setHoverInfo({
        x: mouseX,
        y: mouseY,
        price: dataPoint.c,
        time: timeStr,
        svgX: dotX,
      });
    },
    [history, chartW, lo, hi, chartH, PAD_LEFT, PAD_TOP]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  // Tooltip position: keep it within SVG bounds
  const tooltipW = 90;
  const tooltipH = 32;
  const tooltipX = hoverInfo
    ? Math.min(hoverInfo.svgX + 8, W - tooltipW - 4)
    : 0;
  const tooltipY = hoverInfo
    ? Math.max(PAD_TOP, toY(hoverInfo.price) - tooltipH - 6)
    : 0;

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
            style={{ cursor: history.length >= 2 ? "crosshair" : "default" }}
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
            <line x1={PAD_LEFT} y1={yTP} x2={W - PAD_RIGHT} y2={yTP} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" />
            {/* SL line */}
            <line x1={PAD_LEFT} y1={ySL} x2={W - PAD_RIGHT} y2={ySL} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
            {/* Entry line */}
            <line x1={PAD_LEFT} y1={yEntry} x2={W - PAD_RIGHT} y2={yEntry} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" />
            {/* Current price line */}
            <line x1={PAD_LEFT} y1={yCurrent} x2={W - PAD_RIGHT} y2={yCurrent} stroke={isProfit ? "#16a34a" : "#dc2626"} strokeWidth={2} />

            {/* Current price dot at end of sparkline */}
            <circle cx={PAD_LEFT + chartW} cy={yCurrent} r={4} fill={isProfit ? "#16a34a" : "#dc2626"} />

            {/* Price labels (left axis) */}
            <text x={PAD_LEFT - 6} y={yTP + 4} textAnchor="end" fontSize={9} fill="#16a34a" fontWeight="600">{formatPrice(tp)}</text>
            <text x={PAD_LEFT - 6} y={ySL + 4} textAnchor="end" fontSize={9} fill="#dc2626" fontWeight="600">{formatPrice(sl)}</text>
            <text x={PAD_LEFT - 6} y={yEntry + 4} textAnchor="end" fontSize={9} fill="#6366f1" fontWeight="600">{formatPrice(entry)}</text>
            <text x={PAD_LEFT - 6} y={yCurrent + 4} textAnchor="end" fontSize={9} fill={isProfit ? "#16a34a" : "#dc2626"} fontWeight="700">{formatPrice(currentPrice)}</text>

            {/* Right-side labels */}
            <text x={W - PAD_RIGHT + 4} y={yTP + 4} fontSize={8} fill="#16a34a" fontWeight="600">TP</text>
            <text x={W - PAD_RIGHT + 4} y={ySL + 4} fontSize={8} fill="#dc2626" fontWeight="600">SL</text>
            <text x={W - PAD_RIGHT + 4} y={yEntry + 4} fontSize={8} fill="#6366f1" fontWeight="600">Entry</text>
            <text x={W - PAD_RIGHT + 4} y={yCurrent + 4} fontSize={8} fill={isProfit ? "#16a34a" : "#dc2626"} fontWeight="700">Now</text>

            {/* Signal creation timestamp marker */}
            {signalCreationX !== null && (
              <>
                <line
                  x1={signalCreationX} y1={PAD_TOP}
                  x2={signalCreationX} y2={H - PAD_BOTTOM}
                  stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.75}
                />
                <circle cx={signalCreationX} cy={PAD_TOP + 6} r={3} fill="#f97316" opacity={0.85} />
                <text x={signalCreationX + 4} y={PAD_TOP + 10} fontSize={7} fill="#f97316" fontWeight="600">Signal</text>
              </>
            )}

            {/* Time axis labels */}
            {history.length >= 2 && (() => {
              const labelOffsets = [
                { label: "24h ago", ratio: 0 },
                { label: "18h", ratio: 0.25 },
                { label: "12h", ratio: 0.5 },
                { label: "6h", ratio: 0.75 },
                { label: "Now", ratio: 1 },
              ];
              return labelOffsets.map(({ label, ratio }) => {
                const x = PAD_LEFT + ratio * chartW;
                const anchor = ratio === 0 ? "start" : ratio === 1 ? "end" : "middle";
                return (
                  <text key={label} x={x} y={H - 4} textAnchor={anchor} fontSize={8} fill="#94a3b8">
                    {label}
                  </text>
                );
              });
            })()}

            {/* Invisible hover capture rect over the chart area */}
            {history.length >= 2 && (
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={chartW}
                height={chartH}
                fill="transparent"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}

            {/* Hover crosshair + tooltip */}
            {hoverInfo && (
              <>
                {/* Vertical crosshair line */}
                <line
                  x1={hoverInfo.svgX} y1={PAD_TOP}
                  x2={hoverInfo.svgX} y2={H - PAD_BOTTOM}
                  stroke="#64748b" strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.6}
                />
                {/* Dot on sparkline */}
                <circle
                  cx={hoverInfo.svgX}
                  cy={toY(hoverInfo.price)}
                  r={3.5}
                  fill={isProfit ? "#16a34a" : "#dc2626"}
                  stroke="white"
                  strokeWidth={1.5}
                />
                {/* Tooltip background */}
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipW}
                  height={tooltipH}
                  rx={4}
                  fill="#1e293b"
                  opacity={0.92}
                />
                {/* Tooltip text: price */}
                <text
                  x={tooltipX + tooltipW / 2}
                  y={tooltipY + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="white"
                  fontWeight="700"
                >
                  {formatPrice(hoverInfo.price)}
                </text>
                {/* Tooltip text: time */}
                <text
                  x={tooltipX + tooltipW / 2}
                  y={tooltipY + 24}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#94a3b8"
                >
                  {hoverInfo.time}
                </text>
              </>
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
