import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Zap, Shield, Lightbulb, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface AISignalCardProps {
  signalId: string;
  pair: string;
  signalType: "BUY" | "SELL";
  strategy: string;
  strength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  aiConfidence: number;
  aiReasoning: string;
  aiKeyFactors: string[];
  aiRiskAssessment: string;
  aiInsight: string;
  marketSummary: string;
  indicators: Record<string, number>;
  timestamp: Date;
}

export default function AISignalCard({
  signalId,
  pair,
  signalType,
  strategy,
  strength,
  entryPrice,
  stopLoss,
  takeProfit,
  timeframe,
  aiConfidence,
  aiReasoning,
  aiKeyFactors,
  aiRiskAssessment,
  aiInsight,
  marketSummary,
  indicators,
  timestamp,
}: AISignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const submitFeedback = trpc.ai.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("Thanks! Your feedback helps the AI improve.");
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const handleFeedback = (type: "thumbs_up" | "thumbs_down" | "entered_trade" | "skipped_trade") => {
    if (!isAuthenticated) {
      toast.error("Please log in to give feedback.");
      return;
    }
    if (feedbackGiven) return;
    setFeedbackGiven(type);
    submitFeedback.mutate({ signalId, feedbackType: type });
  };

  const isBuy = signalType === "BUY";
  const riskReward = Math.abs(takeProfit - entryPrice) / Math.abs(stopLoss - entryPrice);
  
  const getConfidenceColor = (c: number) => {
    if (c >= 75) return "text-green-400";
    if (c >= 55) return "text-yellow-400";
    return "text-orange-400";
  };

  const getConfidenceBg = (c: number) => {
    if (c >= 75) return "bg-green-500/10 border-green-500/20";
    if (c >= 55) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-orange-500/10 border-orange-500/20";
  };

  return (
    <Card className={`bg-gray-900 border ${isBuy ? "border-green-500/30" : "border-red-500/30"} overflow-hidden`}>
      {/* AI Badge Strip */}
      <div className={`h-0.5 w-full ${isBuy ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`} />
      
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">{pair}</span>
            <Badge className={`font-bold text-sm px-3 py-0.5 ${isBuy ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"}`}>
              {isBuy ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
              {signalType}
            </Badge>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600 capitalize">
              {strategy}
            </Badge>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
              {timeframe}
            </Badge>
          </div>
          {/* AI Confidence Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getConfidenceBg(aiConfidence)}`}>
            <Brain className={`w-3.5 h-3.5 ${getConfidenceColor(aiConfidence)}`} />
            <span className={`text-xs font-bold ${getConfidenceColor(aiConfidence)}`}>{aiConfidence}%</span>
          </div>
        </div>

        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-gray-800/60">
            <div className="text-xs text-gray-500 mb-0.5">Entry</div>
            <div className="text-sm font-bold text-white">{entryPrice.toFixed(5)}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-900/20 border border-red-500/20">
            <div className="text-xs text-red-400 mb-0.5">Stop Loss</div>
            <div className="text-sm font-bold text-red-300">{stopLoss.toFixed(5)}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-900/20 border border-green-500/20">
            <div className="text-xs text-green-400 mb-0.5">Take Profit</div>
            <div className="text-sm font-bold text-green-300">{takeProfit.toFixed(5)}</div>
          </div>
        </div>

        {/* R:R and Strength */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-gray-400">R:R</span>
            <span className="text-xs font-semibold text-blue-300">1:{riskReward.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-gray-400">Strength</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-3 rounded-sm ${i < strength ? (isBuy ? "bg-green-400" : "bg-red-400") : "bg-gray-700"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Reasoning (always visible) */}
        <div className="p-3 rounded-lg bg-purple-900/10 border border-purple-500/20 mb-3">
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-300 leading-relaxed">{aiReasoning}</p>
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white h-7 text-xs">
              {isExpanded ? (
                <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Hide Details</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Show Full Analysis</>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {/* Key Factors */}
            {aiKeyFactors.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Key Factors
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiKeyFactors.map((factor, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Assessment */}
            <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-orange-300 mb-0.5">Risk Assessment</div>
                  <p className="text-xs text-gray-400">{aiRiskAssessment}</p>
                </div>
              </div>
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div className="p-2.5 rounded-lg bg-yellow-900/10 border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-yellow-300 mb-0.5">AI Insight</div>
                    <p className="text-xs text-gray-400">{aiInsight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Market Summary */}
            {marketSummary && (
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="text-xs font-semibold text-gray-400 mb-1">Market Context</div>
                <p className="text-xs text-gray-400 leading-relaxed">{marketSummary}</p>
              </div>
            )}

            {/* Technical Indicators */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">Technical Indicators</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(indicators).filter(([k]) => k !== "price").map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center px-2 py-1 rounded bg-gray-800/50">
                    <span className="text-xs text-gray-500 uppercase">{key}</span>
                    <span className="text-xs font-mono text-gray-300">{typeof value === "number" ? value.toFixed(4) : value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Feedback Buttons */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-500">Help the AI learn:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("thumbs_up")}
              disabled={!!feedbackGiven}
              className={`h-7 px-2 text-xs gap-1 ${feedbackGiven === "thumbs_up" ? "text-green-400 bg-green-500/10" : "text-gray-400 hover:text-green-400"}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Good
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("entered_trade")}
              disabled={!!feedbackGiven}
              className={`h-7 px-2 text-xs gap-1 ${feedbackGiven === "entered_trade" ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-blue-400"}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Entered
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("thumbs_down")}
              disabled={!!feedbackGiven}
              className={`h-7 px-2 text-xs gap-1 ${feedbackGiven === "thumbs_down" ? "text-red-400 bg-red-500/10" : "text-gray-400 hover:text-red-400"}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Skip
            </Button>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-600 text-right mt-1">
          {new Date(timestamp).toLocaleTimeString()} · AI Generated
        </div>
      </CardContent>
    </Card>
  );
}
