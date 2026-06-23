import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetClubMembers, useGetTodayAttendance, useSubmitAttendance,
  getGetClubMembersQueryKey, getGetTodayAttendanceQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Search, CheckCheck, X, PartyPopper, Clock, Users, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

export default function ManagerAttendance() {
  const { user } = useAuth();
  const clubId = user?.clubId ?? "";
  const qc = useQueryClient();

  const { data: members = [], isLoading: membersLoading } = useGetClubMembers(clubId, {
    query: { queryKey: getGetClubMembersQueryKey(clubId), enabled: !!clubId },
  });

  const { data: todayData, isLoading: todayLoading } = useGetTodayAttendance(clubId, {
    query: { queryKey: getGetTodayAttendanceQueryKey(clubId), enabled: !!clubId },
  });

  const submitMutation = useSubmitAttendance();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [showAttended, setShowAttended] = React.useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const filtered = members.filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(m => m.id)));
  const deselectAll = () => setSelected(new Set());

  const handleSubmit = () => {
    if (selected.size === 0) { toast.error("Select at least one member"); return; }
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate(
      { data: { clubId, memberIds: Array.from(selected) } },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setSuccess(true);
          qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey(clubId) });
          toast.success("Attendance submitted!");
        },
        onError: (e: any) => {
          setConfirmOpen(false);
          toast.error(e?.response?.data?.error ?? "Failed to submit attendance");
        },
      }
    );
  };

  const alreadySubmitted = todayData?.submitted === true;

  if (todayLoading || membersLoading) {
    return (
      <ProtectedLayout allowedRole="manager">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout allowedRole="manager">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit Attendance</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4" /> {dateStr}
          </p>
        </div>

        {alreadySubmitted ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">Attendance Submitted</h2>
                      <p className="text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{todayData?.session?.memberCount}</span> member{todayData?.session?.memberCount !== 1 ? "s" : ""} attended
                        {todayData?.session?.submittedAt && (
                          <span> · Submitted at {new Date(todayData.session.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={() => setShowAttended(!showAttended)} className="gap-2">
                <Users className="w-4 h-4" />
                {showAttended ? "Hide" : "See who attended"} ({todayData?.attendedMembers?.length ?? 0})
              </Button>

              <AnimatePresence>
                {showAttended && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Attended Members</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y">
                          {todayData?.attendedMembers?.map((m, i) => (
                            <div key={m.id} className="flex items-center justify-between py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground text-sm w-6 text-right">{i + 1}</span>
                                <div>
                                  <p className="font-medium text-sm">{m.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{m.age}y · {m.gender}</p>
                                </div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        ) : success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-20 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Submitted!</h2>
            <p className="text-muted-foreground">{selected.size} member{selected.size !== 1 ? "s" : ""} marked as attended today.</p>
          </motion.div>
        ) : (
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={selectAll} className="gap-1.5"><CheckCheck className="w-4 h-4" /> All</Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} className="gap-1.5"><X className="w-4 h-4" /> None</Button>
                  <Badge variant="secondary" className="px-3 py-1">{selected.size} / {members.length}</Badge>
                </div>
              </div>

              {members.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-muted-foreground">
                  <Users className="w-12 h-12 mb-4 opacity-25" />
                  <p className="font-medium">No members in your club</p>
                  <p className="text-sm mt-1">Add members first in the Members tab</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {filtered.map(m => (
                    <motion.button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center gap-4 px-4 py-3 transition-colors text-left
                        ${selected.has(m.id)
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/50"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selected.has(m.id) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                        {selected.has(m.id) && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.age}y · {m.gender} · {m.phoneNumber}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {members.length > 0 && (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={selected.size === 0 || submitMutation.isPending}
                  onClick={handleSubmit}
                >
                  Submit Attendance ({selected.size} selected)
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Attendance</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2 text-sm text-muted-foreground">
            <p>You are about to submit attendance for:</p>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Users className="w-4 h-4 text-primary" />
              {selected.size} member{selected.size !== 1 ? "s" : ""} attended today
            </div>
            <p>Date: <span className="text-foreground">{new Date().toLocaleDateString()}</span></p>
            <p className="text-amber-600 dark:text-amber-400 text-xs">This cannot be changed after submission.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
