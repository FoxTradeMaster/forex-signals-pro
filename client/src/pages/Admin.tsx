import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [grantEmail, setGrantEmail] = useState("");
  const [grantTier, setGrantTier] = useState<"premium" | "pro">("premium");
  const [grantPlan, setGrantPlan] = useState<"monthly" | "yearly" | "pro_monthly" | "pro_yearly">("monthly");

  // Fetch data
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.admin.getAllPayments.useQuery();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();

  // Mutations
  const grantAccessMutation = trpc.admin.grantAccess.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setGrantEmail("");
      refetchUsers();
      refetchPayments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSubscriptionMutation = trpc.admin.updateSubscription.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check if user is admin
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  // Handle grant access
  const handleGrantAccess = () => {
    if (!grantEmail) {
      toast.error("Please enter an email address");
      return;
    }
    grantAccessMutation.mutate({
      email: grantEmail,
      tier: grantTier,
      plan: grantPlan,
    });
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get tier badge color
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "pro":
        return <Badge className="bg-purple-500">PRO</Badge>;
      case "premium":
        return <Badge className="bg-blue-500">PREMIUM</Badge>;
      default:
        return <Badge variant="outline">FREE</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">COMPLETED</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">PENDING</Badge>;
      case "refunded":
        return <Badge className="bg-red-500">REFUNDED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage payments, users, and subscriptions</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="grant">Grant Access</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Records</CardTitle>
                <CardDescription>
                  All PayPal payments received via webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="text-center py-8">Loading payments...</div>
                ) : !payments || payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No payments yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>User Linked</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>PayPal ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.email}</TableCell>
                            <TableCell>${payment.amount} {payment.currency}</TableCell>
                            <TableCell>{payment.plan}</TableCell>
                            <TableCell>{getTierBadge(payment.tier)}</TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              {payment.userId ? (
                                <Badge className="bg-green-500">✓ Linked</Badge>
                              ) : (
                                <Badge variant="outline">Not Linked</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(payment.createdAt)}
                            </TableCell>
                            <TableCell className="text-xs text-gray-400 font-mono">
                              {payment.paypalPaymentId.substring(0, 12)}...
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>
                  All registered users and their subscription status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : !users || users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No users yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Login Method</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email || "N/A"}</TableCell>
                            <TableCell>{user.name || "N/A"}</TableCell>
                            <TableCell>{getTierBadge(user.subscriptionTier)}</TableCell>
                            <TableCell className="text-sm">
                              {user.subscriptionExpiry ? (
                                <span className={
                                  new Date(user.subscriptionExpiry) < new Date() 
                                    ? "text-red-500 font-semibold" 
                                    : "text-green-600"
                                }>
                                  {formatDate(user.subscriptionExpiry)}
                                </span>
                              ) : (
                                <span className="text-gray-400">No expiry</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.role === "admin" ? (
                                <Badge className="bg-red-500">ADMIN</Badge>
                              ) : (
                                <Badge variant="outline">USER</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {user.loginMethod || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(user.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grant Access Tab */}
          <TabsContent value="grant">
            <Card>
              <CardHeader>
                <CardTitle>Manually Grant Access</CardTitle>
                <CardDescription>
                  Grant premium or pro access to users who paid but didn't complete activation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">User Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tier">Subscription Tier</Label>
                      <Select value={grantTier} onValueChange={(v) => setGrantTier(v as "premium" | "pro")}>
                        <SelectTrigger id="tier">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium (10 pairs)</SelectItem>
                          <SelectItem value="pro">Pro (156 pairs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan">Billing Plan</Label>
                      <Select value={grantPlan} onValueChange={(v) => setGrantPlan(v as any)}>
                        <SelectTrigger id="plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="pro_monthly">Pro Monthly</SelectItem>
                          <SelectItem value="pro_yearly">Pro Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGrantAccess}
                    disabled={grantAccessMutation.isPending}
                    className="w-full"
                  >
                    {grantAccessMutation.isPending ? "Granting Access..." : "Grant Access"}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-2">Instructions:</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Enter the email address of the user who paid</li>
                    <li>Select the appropriate tier and billing plan</li>
                    <li>Click "Grant Access" to activate their subscription</li>
                    <li>If the user doesn't exist, a new account will be created</li>
                    <li>The user will be able to log in via magic link</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
