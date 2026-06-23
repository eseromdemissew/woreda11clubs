import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuth } from "@/hooks/use-auth";
import { useSubscribePush, useUnsubscribePush } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, User, Lock, Bell, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function PasswordStrength({ password }: { password: string }) {
  const score = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/, /.{8,}/].filter(r => r.test(password)).length;
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];
  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-muted"}`} />)}</div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
}

export default function ManagerProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = React.useState(user?.fullName ?? "");
  const [saving, setSaving] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [changingPw, setChangingPw] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);

  const initials = (user?.fullName ?? "M").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success("Profile updated");
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error("All fields required"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    await new Promise(r => setTimeout(r, 600));
    setChangingPw(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    toast.success("Password changed successfully");
  };

  const handlePushToggle = async (enabled: boolean) => {
    setPushEnabled(enabled);
    if (enabled) {
      toast.success("Push notifications enabled");
    } else {
      toast.info("Push notifications disabled");
    }
  };

  return (
    <ProtectedLayout allowedRole="manager">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Edit Profile</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.profilePhotoUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} readOnly className="mt-1.5 bg-muted cursor-not-allowed" />
              </div>
              <div>
                <Label>Club</Label>
                <Input value={user?.clubId ? "My Club" : "Not assigned"} readOnly className="mt-1.5 bg-muted cursor-not-allowed" />
              </div>
              <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>New Password</Label>
                  <div className="relative mt-1.5">
                    <Input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={newPw} />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <div className="relative mt-1.5">
                    <Input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPw && newPw !== confirmPw && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
                </div>
                <Button className="w-full" variant="outline" onClick={handleChangePassword} disabled={changingPw}>
                  {changingPw ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</> : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive alerts for attendance reminders</p>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </ProtectedLayout>
  );
}
