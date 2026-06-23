import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useGetReports, useGetAbsentClubs, useListClubs, getGetReportsQueryKey, getGetAbsentClubsQueryKey, type GetReportsParams } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, AlertTriangle, ChevronLeft, ChevronRight, FileBarChart } from "lucide-react";

export default function AdminReports() {
  const [tab, setTab] = React.useState("attendance");
  const [search, setSearch] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [clubFilter, setClubFilter] = React.useState("all");
  const [genderFilter, setGenderFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const { data: clubsData } = useListClubs();

  const reportParams: GetReportsParams = {
    page, limit,
    ...(from ? { from } : {}), ...(to ? { to } : {}),
    ...(clubFilter !== "all" ? { clubId: clubFilter } : {}),
    ...(genderFilter !== "all" ? { gender: genderFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data: reportData, isLoading: reportsLoading } = useGetReports(reportParams, {
    query: { queryKey: getGetReportsQueryKey(reportParams), enabled: tab === "attendance" },
  });

  const { data: absentClubs = [], isLoading: absentLoading } = useGetAbsentClubs({
    query: { queryKey: getGetAbsentClubsQueryKey(), enabled: tab === "absent" },
  });

  const rows = reportData?.rows ?? [];
  const total = reportData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const statusColor = (s: string) => {
    if (s === "critical") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
    if (s === "high") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200";
    if (s === "warning") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200";
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200";
  };

  const exportAttendance = () => {
    import("xlsx" as any).then(({ utils, writeFile }: any) => {
      const ws = utils.json_to_sheet(rows.map((r, i) => ({
        "#": i + 1, "Name": r.memberName, "Age": r.age, "Gender": r.gender,
        "Phone": r.phone, "Club": r.clubName, "Date": r.sessionDate,
        "Attended At": new Date(r.attendedAt).toLocaleString(),
      })));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Attendance");
      writeFile(wb, "attendance-report.xlsx");
    });
  };

  const exportAbsent = () => {
    import("xlsx" as any).then(({ utils, writeFile }: any) => {
      const ws = utils.json_to_sheet(absentClubs.map((c, i) => ({
        "#": i + 1, "Club": c.clubName, "Manager": c.managerName ?? "",
        "Last Submitted": c.lastSubmittedAt ? new Date(c.lastSubmittedAt).toLocaleDateString() : "Never",
        "Days Since": c.daysSince === 999 ? "Never" : c.daysSince, "Status": c.status,
      })));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Absent Clubs");
      writeFile(wb, "absent-clubs.xlsx");
    });
  };

  return (
    <ProtectedLayout allowedRole="admin">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Attendance history and absent clubs overview</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="absent" className="flex items-center gap-1.5">
              Absent Clubs
              {absentClubs.length > 0 && <Badge variant="destructive" className="h-4 text-[10px] px-1">{absentClubs.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search name or phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
                  </div>
                  <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className="w-auto" />
                  <span className="flex items-center text-muted-foreground text-sm">to</span>
                  <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className="w-auto" />
                  <Select value={clubFilter} onValueChange={v => { setClubFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Clubs" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs</SelectItem>
                      {clubsData?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={v => { setGenderFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Genders" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportAttendance} className="gap-2 ml-auto">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Age</TableHead>
                        <TableHead className="hidden md:table-cell">Gender</TableHead>
                        <TableHead className="hidden lg:table-cell">Phone</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportsLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                          ))
                        : rows.length === 0
                        ? (
                          <TableRow><TableCell colSpan={7}>
                            <div className="py-12 flex flex-col items-center text-muted-foreground">
                              <FileBarChart className="w-10 h-10 mb-3 opacity-25" />
                              <p>No attendance records found</p>
                            </div>
                          </TableCell></TableRow>
                        )
                        : rows.map((r, i) => (
                          <TableRow key={`${r.memberId}-${r.sessionDate}`} className="hover:bg-muted/50">
                            <TableCell className="text-muted-foreground text-sm">{(page - 1) * limit + i + 1}</TableCell>
                            <TableCell className="font-medium">{r.memberName}</TableCell>
                            <TableCell className="hidden md:table-cell">{r.age}</TableCell>
                            <TableCell className="hidden md:table-cell">{r.gender}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">{r.phone}</TableCell>
                            <TableCell><Badge variant="secondary">{r.clubName}</Badge></TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.sessionDate}</TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="text-sm">{page} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absent" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={exportAbsent} className="gap-2"><Download className="w-4 h-4" /> Export</Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Last Submitted</TableHead>
                        <TableHead>Days Since</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absentLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                          ))
                        : absentClubs.length === 0
                        ? (
                          <TableRow><TableCell colSpan={6}>
                            <div className="py-12 flex flex-col items-center text-muted-foreground">
                              <AlertTriangle className="w-10 h-10 mb-3 opacity-25" />
                              <p>All clubs are up to date</p>
                            </div>
                          </TableCell></TableRow>
                        )
                        : absentClubs.map((c, i) => (
                          <TableRow key={c.clubId} className="hover:bg-muted/50">
                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell className="font-medium">{c.clubName}</TableCell>
                            <TableCell className="text-muted-foreground">{c.managerName ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {c.lastSubmittedAt ? new Date(c.lastSubmittedAt).toLocaleDateString() : "Never"}
                            </TableCell>
                            <TableCell>{c.daysSince === 999 ? "—" : `${c.daysSince}d`}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusColor(c.status)}`}>
                                {c.status === "critical" || c.status === "high" ? <AlertTriangle className="w-3 h-3" /> : null}
                                {c.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </ProtectedLayout>
  );
}
