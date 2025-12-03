import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, Mail, Monitor, TrendingUp, TrendingDown, Target, AlertTriangle, ArrowLeft, TestTube } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function AlertSettings() {
  const { user, loading, isAuthenticated } = useAuth();
  const [testingAlert, setTestingAlert] = useState(false);

  // Fetch alert preferences
  const { data: preferences, isLoading: loadingPrefs, refetch } = trpc.alerts.getPreferences.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch alert history
  const { data: history, isLoading: loadingHistory } = trpc.alerts.getHistory.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  // Mutations
  const createPreference = trpc.alerts.createPreference.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert preference created");
    },
    onError: (error: any) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const updatePreference = trpc.alerts.updatePreference.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert preference updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const deletePreference = trpc.alerts.deletePreference.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert preference deleted");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete alert: ${error.message}`);
    },
  });

  const testAlert = trpc.alerts.testAlert.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message);
      setTestingAlert(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to send test alert: ${error.message}`);
      setTestingAlert(false);
    },
  });

  const handleTestAlert = async (channel: "browser" | "email" | "both") => {
    setTestingAlert(true);
    await testAlert.mutateAsync({ channel });
  };

  const handleToggleAlert = async (
    alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss",
    enabled: boolean
  ) => {
    const existing = preferences?.find((p: any) => p.alertType === alertType);

    if (existing) {
      await updatePreference.mutateAsync({
        id: existing.id,
        isEnabled: enabled,
      });
    } else if (enabled) {
      await createPreference.mutateAsync({
        alertType,
        channel: "both",
      });
    }
  };

  const handleUpdateChannel = async (
    alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss",
    channel: "browser" | "email" | "both"
  ) => {
    const existing = preferences?.find((p: any) => p.alertType === alertType);
    if (existing) {
      await updatePreference.mutateAsync({
        id: existing.id,
        channel,
      });
    }
  };

  const handleUpdateThreshold = async (
    alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss",
    threshold: string
  ) => {
    const existing = preferences?.find((p: any) => p.alertType === alertType);
    if (existing) {
      await updatePreference.mutateAsync({
        id: existing.id,
        threshold,
      });
    }
  };

  if (loading || loadingPrefs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading alert settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You need to be logged in to manage alert settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Login to Continue</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alertTypes = [
    {
      type: "profit_target" as const,
      icon: Target,
      title: "Profit Target Hit",
      description: "Get notified when a signal reaches its take profit level",
      color: "text-green-500",
      needsThreshold: false,
    },
    {
      type: "stop_loss" as const,
      icon: AlertTriangle,
      title: "Stop Loss Hit",
      description: "Get notified when a signal hits its stop loss level",
      color: "text-red-500",
      needsThreshold: false,
    },
    {
      type: "percent_gain" as const,
      icon: TrendingUp,
      title: "Percentage Gain",
      description: "Get notified when a signal gains a specific percentage",
      color: "text-green-500",
      needsThreshold: true,
      placeholder: "e.g., 2.5",
    },
    {
      type: "percent_loss" as const,
      icon: TrendingDown,
      title: "Percentage Loss",
      description: "Get notified when a signal loses a specific percentage",
      color: "text-red-500",
      needsThreshold: true,
      placeholder: "e.g., 1.5",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-orange-500" />
                <div>
                  <h1 className="text-xl font-bold">Alert Settings</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your P/L notification preferences
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleTestAlert("both")}
              disabled={testingAlert}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testingAlert ? "Sending..." : "Test Alert"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Alert Types */}
        <div className="space-y-4 mb-8">
          {alertTypes.map((alert) => {
            const pref = preferences?.find((p: any) => p.alertType === alert.type);
            const isEnabled = pref?.isEnabled ?? false;
            const Icon = alert.icon;

            return (
              <Card key={alert.type}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${alert.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleAlert(alert.type, checked)}
                    />
                  </div>
                </CardHeader>

                {isEnabled && (
                  <CardContent className="space-y-4">
                    {/* Threshold Input (for percentage-based alerts) */}
                    {alert.needsThreshold && (
                      <div className="space-y-2">
                        <Label htmlFor={`threshold-${alert.type}`}>
                          Threshold (%)
                        </Label>
                        <Input
                          id={`threshold-${alert.type}`}
                          type="number"
                          step="0.1"
                          placeholder={alert.placeholder}
                          defaultValue={pref?.threshold || ""}
                          onBlur={(e) => {
                            if (e.target.value) {
                              handleUpdateThreshold(alert.type, e.target.value);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Channel Selection */}
                    <div className="space-y-2">
                      <Label htmlFor={`channel-${alert.type}`}>
                        Notification Channel
                      </Label>
                      <Select
                        value={pref?.channel || "both"}
                        onValueChange={(value: "browser" | "email" | "both") =>
                          handleUpdateChannel(alert.type, value)
                        }
                      >
                        <SelectTrigger id={`channel-${alert.type}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="browser">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              <span>Browser Only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>Email Only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <span>Both</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Alert History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>
              Your last 10 notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading history...</p>
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No alerts sent yet</p>
                <p className="text-sm">Alerts will appear here when triggered</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900"
                  >
                    <div className={`p-2 rounded-lg ${
                      alert.alertType === "profit_target" || alert.alertType === "percent_gain"
                        ? "bg-green-100 dark:bg-green-900/20 text-green-600"
                        : "bg-red-100 dark:bg-red-900/20 text-red-600"
                    }`}>
                      {alert.alertType === "profit_target" || alert.alertType === "percent_gain" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {alert.pair} {alert.signalType}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {alert.alertType.replace("_", " ").toUpperCase()}
                        {alert.plDollars && ` • ${parseFloat(alert.plDollars) >= 0 ? "+" : ""}$${alert.plDollars}`}
                        {alert.plPercentage && ` (${parseFloat(alert.plPercentage) >= 0 ? "+" : ""}${alert.plPercentage}%)`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {(alert.channel === "browser" || alert.channel === "both") && (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                      {(alert.channel === "email" || alert.channel === "both") && (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
