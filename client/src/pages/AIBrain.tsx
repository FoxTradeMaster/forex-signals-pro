import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, TrendingDown, Zap, BookOpen, Target, Award, RefreshCw, ChevronRight, Lightbulb, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AIBrain() {
  const [, navigate] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: brainStats, isLoading: statsLoading, refetch: refetchStats } = trpc.ai.getBrainStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const { data: insights, isLoading: insightsLoading } = trpc.ai.getDashboardInsights.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = trpc.ai.getStrategyLeaderboard.useQuery();

  const { data: learningHistory, isLoading: historyLoading } = trpc.ai.getLearningHistory.useQuery({ limit: 15 });

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetchStats();
  };

  const stats = brainStats?.stats;
  const topPairs = brainStats?.topPairs || [];
  const recentLessons = brainStats?.recentLessons || [];

  const totalLearned = parseInt(stats?.totalOutcomesLearned || "0");
  const overallWinRate = parseInt(stats?.overallWinRate || "0");
  const totalFeedback = parseInt(stats?.totalFeedbackReceived || "0");
  const totalAnalyzed = parseInt(stats?.totalSignalsAnalyzed || "0");

  const getWinRateColor = (rate: number) => {
    if (rate >= 70) return "text-green-400";
    if (rate >= 55) return "text-yellow-400";
    return "text-red-400";
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 75) return { label: "HIGH", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (score >= 50) return { label: "MEDIUM", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    return { label: "LEARNING", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-purple-900/30 to-gray-900 border-b border-purple-500/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white mr-2"
            >
              ← Back
            </Button>
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Brain</h1>
              <p className="text-xs text-purple-400">Self-Learning Intelligence System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-300 font-medium">
                v{stats?.learningVersion || "1.0"} Active
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-gray-700 text-gray-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/80 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{totalAnalyzed.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">Signals Analyzed</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-green-500/20">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getWinRateColor(overallWinRate)}`}>{overallWinRate}%</div>
              <div className="text-xs text-gray-400 mt-1">Overall Win Rate</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{totalLearned.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">Outcomes Learned</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/80 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{totalFeedback.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">User Feedback</div>
            </CardContent>
          </Card>
        </div>

        {/* Best Setup Banner */}
        {insights?.bestSetup && (
          <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-300">Best Performing Setup</div>
                  <div className="text-xs text-gray-400">
                    {insights.bestSetup.pair} · {insights.bestSetup.strategy} strategy
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{insights.bestSetup.winRate}%</div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest Lesson */}
        {insights?.recentLesson && (
          <Card className="bg-gray-900/80 border-yellow-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-yellow-300 mb-1">Latest AI Lesson Learned</div>
                <p className="text-sm text-gray-300 leading-relaxed">{insights.recentLesson}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-1" />
              Strategy Leaderboard
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              <BookOpen className="w-4 h-4 mr-1" />
              Learning History
            </TabsTrigger>
            <TabsTrigger value="pairs" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              Top Pairs
            </TabsTrigger>
            <TabsTrigger value="lessons" className="data-[state=active]:bg-purple-600">
              <Lightbulb className="w-4 h-4 mr-1" />
              Lessons
            </TabsTrigger>
          </TabsList>

          {/* Strategy Leaderboard */}
          <TabsContent value="leaderboard">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  Strategy Performance Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="text-center text-gray-500 py-8">Loading leaderboard...</div>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">The AI is still learning.</p>
                    <p className="text-gray-500 text-xs mt-1">Rankings will appear after analyzing 3+ signals per strategy.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((item, idx) => {
                      const badge = getConfidenceBadge(item.confidenceScore);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">{item.pair}</span>
                              <span className="text-xs text-gray-400 capitalize">{item.strategy}</span>
                              <span className="text-xs text-gray-500">{item.timeframe}</span>
                            </div>
                            <div className="mt-1.5">
                              <Progress value={item.winRate} className="h-1.5" />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-lg font-bold ${getWinRateColor(item.winRate)}`}>
                              {item.winRate.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">{item.totalSignals} signals</div>
                          </div>
                          <Badge className={`text-xs border ${badge.color} hidden md:flex`}>
                            {badge.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning History */}
          <TabsContent value="history">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Recent Learning Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center text-gray-500 py-8">Loading history...</div>
                ) : !learningHistory || learningHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No learning records yet.</p>
                    <p className="text-gray-500 text-xs mt-1">Records appear as the AI generates and resolves signals.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {learningHistory.map((record, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">{record.pair}</span>
                              <Badge variant="outline" className={`text-xs ${record.signalType === "BUY" ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}`}>
                                {record.signalType}
                              </Badge>
                              <span className="text-xs text-gray-500 capitalize">{record.strategy}</span>
                            </div>
                            {record.aiReasoning && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{record.aiReasoning}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {record.outcome ? (
                              <Badge className={`text-xs ${record.outcome === "target_hit" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                {record.outcome === "target_hit" ? "✅ Win" : "❌ Loss"}
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-blue-500/20 text-blue-400">📊 Active</Badge>
                            )}
                            {record.plPips && (
                              <div className={`text-xs mt-1 font-semibold ${parseFloat(record.plPips) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {parseFloat(record.plPips) >= 0 ? "+" : ""}{parseFloat(record.plPips).toFixed(1)} pips
                              </div>
                            )}
                          </div>
                        </div>
                        {record.aiConfidence && (
                          <div className="flex items-center gap-2 mt-2">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-gray-500">AI Confidence: {record.aiConfidence}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Pairs */}
          <TabsContent value="pairs">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Best Performing Currency Pairs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPairs.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No pair data yet.</p>
                    <p className="text-gray-500 text-xs mt-1">Rankings appear after 3+ signals per pair.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{pair.pair}</div>
                          <div className="text-xs text-gray-400 capitalize">{pair.strategy} · {pair.timeframe}</div>
                          <Progress value={parseFloat(pair.winRate)} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getWinRateColor(parseFloat(pair.winRate))}`}>
                            {parseFloat(pair.winRate).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">{pair.totalSignals} signals</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lessons */}
          <TabsContent value="lessons">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  AI Lessons Learned
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentLessons.length === 0 ? (
                  <div className="text-center py-8">
                    <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No lessons yet.</p>
                    <p className="text-gray-500 text-xs mt-1">The AI generates lessons after each resolved signal.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLessons.map((lesson, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-yellow-900/10 border border-yellow-500/20">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-yellow-300">{lesson.pair}</span>
                              <span className="text-xs text-gray-500 capitalize">{lesson.strategy}</span>
                              {lesson.outcome && (
                                <Badge className={`text-xs ${lesson.outcome === "target_hit" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                  {lesson.outcome === "target_hit" ? "Win" : "Loss"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{lesson.lessonsLearned}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* How It Works */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              How the AI Brain Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: <Zap className="w-5 h-5 text-yellow-400" />,
                  title: "Analyze",
                  desc: "Processes real-time Polygon market data with RSI, MACD, Bollinger Bands, and ATR indicators.",
                },
                {
                  icon: <Brain className="w-5 h-5 text-purple-400" />,
                  title: "Reason",
                  desc: "Uses Gemini AI to reason about market conditions, apply learned weights, and generate signals with full explanations.",
                },
                {
                  icon: <TrendingUp className="w-5 h-5 text-green-400" />,
                  title: "Learn",
                  desc: "Tracks every signal outcome, updates strategy weights, and generates lessons to continuously improve accuracy.",
                },
              ].map((step, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    {step.icon}
                    <span className="font-semibold text-white text-sm">{step.title}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
