import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function SignalOfTheDayBanner() {
  const [expanded, setExpanded] = useState(false);

  const { data: signal, isLoading } = trpc.referral.getSignalOfTheDay.useQuery(undefined, {
    staleTime: 1000 * 60 * 30, // cache for 30 minutes
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-4 border border-yellow-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-yellow-200 rounded w-48" />
            <div className="h-3 bg-yellow-100 rounded w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!signal) return null;

  const isAi = signal.isAiGenerated === "true";
  const confidence = signal.aiConfidence ? parseInt(signal.aiConfidence) : null;
  const isBuy = signal.signalType === "BUY";

  return (
    <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-2xl border border-yellow-300 shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-400 px-4 py-2">
        <span className="text-lg">⭐</span>
        <span className="text-sm font-bold text-yellow-900 tracking-wide uppercase">AI Pick of the Day</span>
        {isAi && confidence !== null && (
          <span className="ml-auto text-xs font-semibold bg-yellow-900/20 text-yellow-900 px-2 py-0.5 rounded-full">
            {confidence}% AI Confidence
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pair + Direction */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{signal.pair}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isBuy
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}>
                  {signal.signalType}
                </span>
                {isAi && (
                  <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                    🧠 AI Enhanced
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Entry: <span className="font-semibold text-gray-700">{signal.entryPrice}</span>
                {" · "}
                TP: <span className="font-semibold text-green-600">{signal.takeProfit}</span>
                {" · "}
                SL: <span className="font-semibold text-red-500">{signal.stopLoss}</span>
              </div>
            </div>
          </div>

          {/* Expand button */}
          {isAi && signal.aiReasoning && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1 shrink-0"
            >
              {expanded ? "Hide" : "Why?"}
              <svg
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* AI Reasoning (expandable) */}
        {expanded && signal.aiReasoning && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <p className="text-xs text-gray-700 leading-relaxed">{signal.aiReasoning}</p>
            {signal.aiInsight && (
              <p className="text-xs text-amber-700 mt-2 font-medium">💡 {signal.aiInsight}</p>
            )}
            {signal.aiKeyFactors && (
              <div className="flex flex-wrap gap-1 mt-2">
                {signal.aiKeyFactors.split(",").map((f: string, i: number) => (
                  <span key={i} className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full">
                    {f.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
