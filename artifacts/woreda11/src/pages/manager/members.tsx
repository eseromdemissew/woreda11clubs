import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetClubMembers, useCreateMember, useUpdateMember,
  getGetClubMembersQueryKey, MemberInputGender, MemberUpdateGender
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Search, Users } from "lucide-react";
import { toast } from "sonner";

type MemberForm = { fullName: string; phoneNumber: string; age: string; gender: string };
const defaultForm: MemberForm = { fullName: "", phoneNumber: "", age: "", gender: "Male" };

export default function ManagerMembers() {
  const { user } = useAuth();
  const clubId = user?.clubId ?? "";
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useGetClubMembers(clubId, {
    query: { queryKey: getGetClubMembersQueryKey(clubId), enabled: !!clubId },
  });

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState<{ mode: "create" | "edit"; memberId?: string } | null>(null);
  const [form, setForm] = React.useState<MemberForm>(defaultForm);

  const filtered = members.filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) || m.phoneNumber.includes(search)
  );

  const openCreate = () => { setForm(defaultForm); setModal({ mode: "create" }); };
  const openEdit = (m: typeof members[0]) => {
    setForm({ fullName: m.fullName, phoneNumber: m.phoneNumber, age: String(m.age), gender: m.gender });
    setModal({ mode: "edit", memberId: m.id });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetClubMembersQueryKey(clubId) });

  const handleSave = () => {
    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.age || !form.gender) {
      toast.error("All fields required"); return;
    }
    const data = { clubId, fullName: form.fullName, phoneNumber: form.phoneNumber, age: parseInt(form.age), gender: form.gender as MemberInputGender };
    if (modal?.mode === "create") {
      createMutation.mutate({ data }, {
        onSuccess: () => { toast.success("Member added"); invalidate(); setModal(null); },
        onError: () => toast.error("Failed to add member"),
      });
    } else if (modal?.memberId) {
      const updateData = { ...data, gender: form.gender as MemberUpdateGender };
      updateMutation.mutate({ id: modal.memberId, data: updateData }, {
        onSuccess: () => { toast.success("Member updated"); invalidate(); setModal(null); },
        onError: () => toast.error("Failed to update"),
      });
    }
  };

  return (
    <ProtectedLayout allowedRole="manager">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Club Members</h1>
            <p className="text-muted-foreground mt-1">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Add Member</Button>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Age</TableHead>
                    <TableHead className="hidden sm:table-cell">Gender</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                      ))
                    : filtered.length === 0
                    ? (
                      <TableRow><TableCell colSpan={7}>
                        <div className="py-12 flex flex-col items-center text-muted-foreground">
                          <Users className="w-10 h-10 mb-3 opacity-25" />
                          <p>{members.length === 0 ? "No members yet. Add your first!" : "No members match your search"}</p>
                        </div>
                      </TableCell></TableRow>
                    )
                    : filtered.map((m, i) => (
                        <TableRow key={m.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                          <TableCell className="font-medium">{m.fullName}</TableCell>
                          <TableCell className="hidden sm:table-cell">{m.age}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={
                              m.gender === "Female" ? "border-pink-400 text-pink-600 dark:text-pink-400" :
                              m.gender === "Male" ? "border-blue-400 text-blue-600 dark:text-blue-400" : ""
                            }>{m.gender}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{m.phoneNumber}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="h-8 w-8 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{modal?.mode === "create" ? "Add Member" : "Edit Member"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Phone Number</Label><Input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Age</Label><Input type="number" min="5" max="100" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className="mt-1.5" /></div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {modal?.mode === "create" ? "Add Member" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
