import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, Mail, Monitor, TrendingUp, TrendingDown, Target, AlertTriangle, ArrowLeft, TestTube, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function AlertSettings() {
  const { user, loading, isAuthenticated } = useAuth();
  const [testingAlert, setTestingAlert] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Check if push notifications are supported
  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  // Onboarding tutorial
  const startTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: "#push-notification-card",
          popover: {
            title: "Enable Push Notifications",
            description: "Click here to enable browser push notifications. You'll receive instant alerts even when the site is closed. Works on desktop and mobile browsers.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#alert-type-profit-target",
          popover: {
            title: "Profit Target Alerts",
            description: "Get notified when a signal reaches its take profit level. No threshold needed - alerts trigger automatically when the target is hit.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#alert-type-stop-loss",
          popover: {
            title: "Stop Loss Alerts",
            description: "Get notified when a signal hits its stop loss level. Helps you manage risk and exit losing trades quickly.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#alert-type-percent-gain",
          popover: {
            title: "Percentage Gain Alerts",
            description: "Set a custom threshold (e.g., 2.5%) to get notified when a signal gains that percentage. Great for taking partial profits.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#alert-type-percent-loss",
          popover: {
            title: "Percentage Loss Alerts",
            description: "Set a custom threshold (e.g., 1.5%) to get notified when a signal loses that percentage. Helps you cut losses early.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#alert-channel-select",
          popover: {
            title: "Alert Channels",
            description: "Choose how you want to receive alerts: Browser (push notifications), Email, or Both. Browser alerts are instant, while email is reliable for all devices.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#test-alert-button",
          popover: {
            title: "Test Your Alerts",
            description: "Click here to send a test alert and verify your notification settings are working correctly.",
            side: "bottom",
            align: "end",
          },
        },
      ],
    });
    driverObj.drive();
  };

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

  const subscribePush = trpc.alerts.subscribePush.useMutation({
    onSuccess: () => {
      toast.success("Push notifications enabled!");
      setSubscribingPush(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to enable push notifications: ${error.message}`);
      setSubscribingPush(false);
    },
  });

  const { data: vapidData } = trpc.alerts.getVapidPublicKey.useQuery();

  const handleTestAlert = async (channel: "browser" | "email" | "both") => {
    setTestingAlert(true);
    await testAlert.mutateAsync({ channel });
  };

  const handleEnablePushNotifications = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in your browser");
      return;
    }

    setSubscribingPush(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setSubscribingPush(false);
        return;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key
      if (!vapidData?.publicKey) {
        toast.error("Failed to get VAPID key");
        setSubscribingPush(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.publicKey,
      });

      // Send subscription to server
      const subscriptionJSON = subscription.toJSON();
      await subscribePush.mutateAsync({
        subscription: {
          endpoint: subscriptionJSON.endpoint!,
          keys: {
            p256dh: subscriptionJSON.keys!.p256dh!,
            auth: subscriptionJSON.keys!.auth!,
          },
        },
        deviceName: navigator.userAgent.includes("Mobile") ? "Mobile Device" : "Desktop",
      });
    } catch (error: any) {
      console.error("Push notification error:", error);
      toast.error(`Failed to enable push notifications: ${error.message}`);
      setSubscribingPush(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
        {/* Blurred preview of Alert Settings UI */}
        <div className="blur-sm pointer-events-none select-none opacity-60">
          <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 w-40 bg-gray-300 rounded-lg" />
              <div className="h-6 w-24 bg-orange-200 rounded-full" />
            </div>
            {/* Fake toggle rows */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {["Price Alert", "Signal Generated", "Take Profit Hit", "Stop Loss Hit", "Market Open"].map((label) => (
                <div key={label} className="flex items-center justify-between px-5 py-4 border-b last:border-0">
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-gray-300 rounded" />
                    <div className="h-3 w-48 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-11 bg-orange-300 rounded-full" />
                </div>
              ))}
            </div>
            {/* Fake threshold inputs */}
            <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
              <div className="h-5 w-36 bg-gray-300 rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-gray-100 rounded-lg border" />
                <div className="h-10 bg-gray-100 rounded-lg border" />
              </div>
            </div>
          </div>
        </div>

        {/* Overlay CTA card */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🦊</span>
              </div>
              <CardTitle className="text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                FOX TRADE MASTER™
              </CardTitle>
              <p className="text-base font-semibold text-gray-900 mt-1">Alert Settings</p>
              <CardDescription className="text-sm mt-1">
                Get notified instantly when signals are generated, profit targets are hit, or market conditions change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Price alerts", "Signal alerts", "Take profit", "Push notifications"].map((f) => (
                  <div key={f} className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2.5 py-1.5 text-orange-700 font-medium">
                    <span className="text-green-500">✓</span> {f}
                  </div>
                ))}
              </div>
              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 font-semibold">
                <Link href="/activate">Login / Activate Account</Link>
              </Button>
              <Button asChild variant="outline" className="w-full text-sm">
                <Link href="/premium">View Plans &amp; Pricing</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground">
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
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
            <div className="flex gap-2">
              <Button
                onClick={startTutorial}
                variant="outline"
                size="sm"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Tutorial
              </Button>
              <Button
                id="test-alert-button"
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Push Notification Setup */}
        {pushSupported && pushPermission !== "granted" && (
          <Card id="push-notification-card" className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Enable Browser Push Notifications</CardTitle>
                  <CardDescription className="mt-1">
                    Get instant alerts even when the site is closed. Works on desktop and mobile browsers.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleEnablePushNotifications}
                disabled={subscribingPush}
                className="w-full sm:w-auto"
              >
                <Bell className="h-4 w-4 mr-2" />
                {subscribingPush ? "Enabling..." : "Enable Push Notifications"}
              </Button>
            </CardContent>
          </Card>
        )}

        {pushSupported && pushPermission === "granted" && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <Monitor className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Push Notifications Enabled</CardTitle>
                  <CardDescription className="mt-1">
                    You'll receive browser notifications for your selected alerts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {!pushSupported && (
          <Card className="mb-6 border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Monitor className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Push Notifications Not Supported</CardTitle>
                  <CardDescription className="mt-1">
                    Your browser doesn't support push notifications. You can still receive email alerts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Alert Types */}
        <div className="space-y-4 mb-8">
          {alertTypes.map((alert) => {
            const pref = preferences?.find((p: any) => p.alertType === alert.type);
            const isEnabled = pref?.isEnabled ?? false;
            const Icon = alert.icon;

            return (
              <Card key={alert.type} id={`alert-type-${alert.type.replace('_', '-')}`}>
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
                    <div className="space-y-2" id="alert-channel-select">
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
