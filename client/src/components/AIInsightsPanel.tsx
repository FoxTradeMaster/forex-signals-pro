import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Lightbulb, Zap, ChevronRight, Award } from "lucide-react";
import { useLocation } from "wouter";

export default function AIInsightsPanel() {
  const [, navigate] = useLocation();

  const { data: insights, isLoading } = trpc.ai.getDashboardInsights.useQuery(undefined, {
    refetchInterval: 120000, // refresh every 2 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-gray-900/80 border-purple-500/20 animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-800 rounded w-full mb-2" />
          <div className="h-3 bg-gray-800 rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const totalLearned = insights?.totalLearned || 0;
  const winRate = insights?.overallWinRate || 0;
  const isActive = insights?.isLearning || false;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-purple-950/30 border-purple-500/20 overflow-hidden">
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
      
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">AI Brain</div>
              <div className="text-xs text-purple-400">Self-Learning System</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
            <span className="text-xs text-gray-400">{isActive ? "Active" : "Initializing"}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-gray-800/50">
            <div className="text-lg font-bold text-purple-400">{totalLearned}</div>
            <div className="text-xs text-gray-500">Learned</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-800/50">
            <div className={`text-lg font-bold ${winRate >= 60 ? "text-green-400" : winRate >= 50 ? "text-yellow-400" : "text-gray-400"}`}>
              {winRate}%
            </div>
            <div className="text-xs text-gray-500">Win Rate</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-800/50">
            <div className="text-lg font-bold text-blue-400">{insights?.learningVersion || "1.0"}</div>
            <div className="text-xs text-gray-500">Version</div>
          </div>
        </div>

        {/* Best Setup */}
        {insights?.bestSetup && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-900/10 border border-green-500/20 mb-3">
            <Award className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-400">Best: </span>
              <span className="text-xs font-semibold text-green-300">{insights.bestSetup.pair}</span>
              <span className="text-xs text-gray-500"> · {insights.bestSetup.strategy}</span>
            </div>
            <span className="text-xs font-bold text-green-400">{insights.bestSetup.winRate}%</span>
          </div>
        )}

        {/* Latest Lesson */}
        {insights?.recentLesson && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-900/10 border border-yellow-500/20 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{insights.recentLesson}</p>
          </div>
        )}

        {/* No data yet */}
        {!isActive && (
          <div className="text-center py-2 mb-3">
            <p className="text-xs text-gray-500">The AI brain is initializing.</p>
            <p className="text-xs text-gray-600">It will start learning from the first signal.</p>
          </div>
        )}

        {/* CTA Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/ai-brain")}
          className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 text-xs h-8"
        >
          <Brain className="w-3.5 h-3.5 mr-1.5" />
          View AI Brain Dashboard
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
