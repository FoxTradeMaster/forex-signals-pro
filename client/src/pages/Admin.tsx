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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Search, UserCheck, UserX, ShieldCheck, ShieldOff, Calendar, RefreshCw, DollarSign, Users, CreditCard, TrendingUp } from "lucide-react";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [grantEmail, setGrantEmail] = useState("");
  const [grantTier, setGrantTier] = useState<"premium" | "pro">("premium");
  const [grantPlan, setGrantPlan] = useState<"monthly" | "yearly" | "pro_monthly" | "pro_yearly">("monthly");
  const [userSearch, setUserSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; userId: string; email: string; months: number }>({
    open: false, userId: "", email: "", months: 1,
  });

  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.admin.getAllPayments.useQuery();
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();

  const grantAccessMutation = trpc.admin.grantAccess.useMutation({
    onSuccess: (data) => { toast.success(data.message); setGrantEmail(""); refetchUsers(); refetchPayments(); },
    onError: (error) => toast.error(error.message),
  });
  const revokeAccessMutation = trpc.admin.revokeAccess.useMutation({
    onSuccess: (data) => { toast.success(data.message); refetchUsers(); },
    onError: (error) => toast.error(error.message),
  });
  const extendSubscriptionMutation = trpc.admin.extendSubscription.useMutation({
    onSuccess: (data) => { toast.success(data.message); setExtendDialog(d => ({ ...d, open: false })); refetchUsers(); },
    onError: (error) => toast.error(error.message),
  });
  const makeAdminMutation = trpc.admin.makeAdmin.useMutation({
    onSuccess: (data) => { toast.success(data.message); refetchUsers(); },
    onError: (error) => toast.error(error.message),
  });
  const removeAdminMutation = trpc.admin.removeAdmin.useMutation({
    onSuccess: (data) => { toast.success(data.message); refetchUsers(); },
    onError: (error) => toast.error(error.message),
  });

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

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const isExpired = (date: Date | string | null | undefined) =>
    !!date && new Date(date) < new Date();

  const getTierBadge = (tier: string | null | undefined) => {
    switch (tier) {
      case "pro": return <Badge className="bg-purple-600 text-white">PRO</Badge>;
      case "premium": return <Badge className="bg-blue-600 text-white">PREMIUM</Badge>;
      default: return <Badge variant="outline" className="text-gray-500">FREE</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-600 text-white">COMPLETED</Badge>;
      case "pending": return <Badge className="bg-yellow-500 text-white">PENDING</Badge>;
      case "refunded": return <Badge className="bg-red-500 text-white">REFUNDED</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = (usersData || []).filter(u =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredPayments = (payments || []).filter(p =>
    !paymentSearch || p.email?.toLowerCase().includes(paymentSearch.toLowerCase()) || p.paypalPaymentId?.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  const totalRevenue = (payments || []).filter(p => p.status === "completed").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const premiumUsers = (usersData || []).filter(u => u.subscriptionTier === "premium").length;
  const proUsers = (usersData || []).filter(u => u.subscriptionTier === "pro").length;
  const activeUsers = (usersData || []).filter(u =>
    u.subscriptionTier && u.subscriptionTier !== "free" && (!u.subscriptionExpiry || !isExpired(u.subscriptionExpiry))
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🦊 Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fox Trade Master — Subscription Management</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>← Back to Dashboard</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Users</p>
                  <p className="text-xl font-bold text-gray-900">{(usersData || []).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Active Paid</p>
                  <p className="text-xl font-bold text-gray-900">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Premium / Pro</p>
                  <p className="text-xl font-bold text-gray-900">{premiumUsers} / {proUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="grant">Grant Access</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>Manage Users & Subscriptions</CardTitle>
                    <CardDescription>Extend, revoke, or change subscription tiers for any user</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by email or name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => (
                          <TableRow key={u.id} className={u.id === user.id ? "bg-orange-50" : ""}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{u.name || "—"}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getTierBadge(u.subscriptionTier)}</TableCell>
                            <TableCell>
                              {u.role === "admin" ? (
                                <span className="text-xs text-purple-600 font-semibold">∞ Permanent</span>
                              ) : u.subscriptionExpiry ? (
                                <span className={isExpired(u.subscriptionExpiry) ? "text-red-500 text-xs font-semibold" : "text-green-600 text-xs"}>
                                  {isExpired(u.subscriptionExpiry) ? "⚠ " : "✓ "}{formatDate(u.subscriptionExpiry)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">No expiry</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.role === "admin"
                                ? <Badge className="bg-red-600 text-white text-xs">ADMIN</Badge>
                                : <Badge variant="outline" className="text-xs">USER</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDate(u.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                  onClick={() => setExtendDialog({ open: true, userId: u.id, email: u.email || "", months: 1 })}
                                >
                                  <Calendar className="h-3 w-3 mr-1" /> Extend
                                </Button>
                                {u.subscriptionTier && u.subscriptionTier !== "free" && u.id !== user.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm(`Revoke access for ${u.email}? They will be set to free tier.`)) {
                                        revokeAccessMutation.mutate({ userId: u.id });
                                      }
                                    }}
                                  >
                                    <UserX className="h-3 w-3 mr-1" /> Revoke
                                  </Button>
                                )}
                                {u.id !== user.id && (
                                  u.role === "admin" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                                      onClick={() => {
                                        if (confirm(`Remove admin role from ${u.email}?`)) {
                                          removeAdminMutation.mutate({ userId: u.id });
                                        }
                                      }}
                                    >
                                      <ShieldOff className="h-3 w-3 mr-1" /> Demote
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                                      onClick={() => {
                                        if (confirm(`Promote ${u.email} to admin?`)) {
                                          makeAdminMutation.mutate({ userId: u.id });
                                        }
                                      }}
                                    >
                                      <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                                    </Button>
                                  )
                                )}
                              </div>
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

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>PayPal Payment Records</CardTitle>
                    <CardDescription>All payments received via PayPal webhook</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by email or order ID..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No payment records found</p>
                    <p className="text-xs text-gray-400 mt-1">Payments appear here after PayPal webhook delivery</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>PayPal Order ID</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium">{p.email || "—"}</TableCell>
                            <TableCell className="font-semibold text-green-700">${p.amount} {p.currency}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{p.plan?.replace(/_/g, " ") || "—"}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(p.status)}</TableCell>
                            <TableCell className="text-xs text-gray-500 font-mono">
                              {(p.paypalPaymentId || "").slice(0, 16)}...
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{formatDate(p.createdAt)}</TableCell>
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
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" /> Manually Grant Access
                </CardTitle>
                <CardDescription>Activate a subscription for a user who paid but didn't complete the magic link flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="grant-email">User Email</Label>
                  <Input id="grant-email" type="email" placeholder="user@example.com" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subscription Tier</Label>
                    <Select value={grantTier} onValueChange={(v) => setGrantTier(v as "premium" | "pro")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium (10 pairs)</SelectItem>
                        <SelectItem value="pro">Pro (156 pairs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Plan</Label>
                    <Select value={grantPlan} onValueChange={(v) => setGrantPlan(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  onClick={() => {
                    if (!grantEmail) { toast.error("Please enter an email address"); return; }
                    grantAccessMutation.mutate({ email: grantEmail, tier: grantTier, plan: grantPlan });
                  }}
                  disabled={grantAccessMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {grantAccessMutation.isPending ? "Granting Access..." : "Grant Access"}
                </Button>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold">How it works:</p>
                  <p>• Enter the email of the user who paid via PayPal</p>
                  <p>• Select their tier and billing plan</p>
                  <p>• Click Grant Access — their account will be activated immediately</p>
                  <p>• If no account exists, a new one is created automatically</p>
                  <p>• The user can then log in via the magic link email flow</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Extend Subscription Dialog */}
      <Dialog open={extendDialog.open} onOpenChange={(open) => setExtendDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Extend subscription for <strong>{extendDialog.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Number of months to extend</Label>
              <Select
                value={String(extendDialog.months)}
                onValueChange={(v) => setExtendDialog(d => ({ ...d, months: parseInt(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12, 24].map(m => (
                    <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Extension is added from the current expiry (or today if already expired).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={extendSubscriptionMutation.isPending}
              onClick={() => extendSubscriptionMutation.mutate({ userId: extendDialog.userId, months: extendDialog.months })}
            >
              {extendSubscriptionMutation.isPending ? "Extending..." : `Extend ${extendDialog.months} Month${extendDialog.months > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
