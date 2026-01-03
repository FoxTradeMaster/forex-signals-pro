import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

export function PerformanceChart() {
  const [mounted, setMounted] = useState(false);
  const { data: plTrend } = trpc.analytics.getDailyPLTrend.useQuery(
    { days: 30 },
    { enabled: mounted }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !plTrend || plTrend.length === 0) {
    return null;
  }

  // Calculate cumulative P/L
  let cumulative = 0;
  const chartData = plTrend.map((item) => {
    cumulative += item.dailyPL;
    return {
      date: item.date,
      cumulativePL: cumulative,
      dailyPL: item.dailyPL,
    };
  });

  const finalPL = cumulative;
  const isProfit = finalPL >= 0;

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            30-Day Performance Trend
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cumulative profit/loss over time
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total P/L</div>
          <div className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
            {isProfit ? "+" : ""}{finalPL.toFixed(2)} USD
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            formatter={(value: number, name: string) => {
              if (name === "cumulativePL") {
                return [`$${value.toFixed(2)}`, "Cumulative P/L"];
              }
              return [`$${value.toFixed(2)}`, "Daily P/L"];
            }}
            labelFormatter={(label) => {
              const date = new Date(label);
              return date.toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric",
                year: "numeric" 
              });
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePL"
            stroke={isProfit ? "#16a34a" : "#dc2626"}
            strokeWidth={2}
            dot={{ fill: isProfit ? "#16a34a" : "#dc2626", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>
          📈 {plTrend.length} trading days
        </div>
        <div>
          Avg: ${(finalPL / plTrend.length).toFixed(2)}/day
        </div>
      </div>
    </Card>
  );
}
