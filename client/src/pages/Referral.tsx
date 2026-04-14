import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Referral() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [copiedTrial, setCopiedTrial] = useState(false);

  const { data: referralData, isLoading } = trpc.referral.getMyReferral.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleCopy = async (text: string, type: "link" | "trial") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedTrial(true);
        setTimeout(() => setCopiedTrial(false), 2000);
      }
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (platform: string) => {
    if (!referralData) return;
    const message = `🦊 I'm using FOX TRADE MASTER™ for AI-powered forex signals — join me and get a 7-day free trial! ${referralData.trialLink}`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralData.trialLink)}&text=${encodeURIComponent("🦊 Join FOX TRADE MASTER™ — AI-powered forex signals with a 7-day free trial!")}`,
      email: `mailto:?subject=${encodeURIComponent("Try FOX TRADE MASTER™ Free for 7 Days")}&body=${encodeURIComponent(message)}`,
    };
    window.open(urls[platform], "_blank");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl border-0">
          <CardContent className="pt-8 pb-8">
            <div className="text-5xl mb-4">🦊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-500 mb-6">You need to be logged in to access your referral link.</p>
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/activate")}>
              Login to Continue
            </Button>
            <Button variant="outline" className="w-full mt-3" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Refer a Friend</h1>
            <p className="text-sm text-gray-500">Share FOX TRADE MASTER™ and grow together</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-5xl">🦊</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Invite Friends, Grow Together</h2>
              <p className="text-orange-100 text-sm">
                Share your unique referral link. Every friend who joins gets a 7-day free trial of Premium — and you build your trading community.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && referralData && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-5 text-center">
                <div className="text-4xl font-bold text-orange-500">{referralData.referralCount}</div>
                <div className="text-sm text-gray-500 mt-1">Friends Referred</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-5 text-center">
                <div className="text-4xl font-bold text-green-500">
                  {referralData.referralCode || "—"}
                </div>
                <div className="text-sm text-gray-500 mt-1">Your Code</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Referral Link */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>🔗</span> Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ) : (
              <>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-3 border border-gray-200">
                  <span className="text-sm text-gray-600 flex-1 truncate font-mono">
                    {referralData?.referralLink}
                  </span>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                    onClick={() => referralData && handleCopy(referralData.referralLink, "link")}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Friends who sign up via this link will be credited to you.</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trial Link */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>🎁</span> Free Trial Link
              <Badge className="bg-green-100 text-green-700 text-xs">Converts Better</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ) : (
              <>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-3 border border-gray-200">
                  <span className="text-sm text-gray-600 flex-1 truncate font-mono">
                    {referralData?.trialLink}
                  </span>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white shrink-0"
                    onClick={() => referralData && handleCopy(referralData.trialLink, "trial")}
                  >
                    {copiedTrial ? "✓ Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Sends friends directly to the 7-day free trial offer page.</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Share Buttons */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>📢</span> Share On
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-sky-200 text-sky-600 hover:bg-sky-50"
                onClick={() => handleShare("twitter")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter / X
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50"
                onClick={() => handleShare("whatsapp")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-blue-200 text-blue-500 hover:bg-blue-50"
                onClick={() => handleShare("telegram")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => handleShare("email")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: "1", icon: "🔗", title: "Share Your Link", desc: "Copy your referral link and share it with fellow traders." },
                { step: "2", icon: "✉️", title: "Friend Signs Up", desc: "They click your link and get a 7-day free trial of Premium." },
                { step: "3", icon: "📊", title: "Track Your Referrals", desc: "See how many friends you've referred right here on this page." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{item.icon} {item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
