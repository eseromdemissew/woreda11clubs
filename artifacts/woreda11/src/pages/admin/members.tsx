import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useListMembers, useListClubs, getListMembersQueryKey, type ListMembersParams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, ChevronLeft, ChevronRight, Users } from "lucide-react";

export default function AdminMembers() {
  const [search, setSearch] = React.useState("");
  const [clubFilter, setClubFilter] = React.useState("all");
  const [genderFilter, setGenderFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const limit = 25;

  const { data: clubsData } = useListClubs();

  const params: ListMembersParams = {
    page,
    limit,
    ...(clubFilter !== "all" ? { clubId: clubFilter } : {}),
    ...(genderFilter !== "all" ? { gender: genderFilter } : {}),
  };

  const { data, isLoading } = useListMembers(params, {
    query: { queryKey: getListMembersQueryKey(params) },
  });

  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filtered = search
    ? members.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.phoneNumber.includes(search)
      )
    : members;

  const handleExport = () => {
    import("xlsx" as any).then(({ utils, writeFile }: any) => {
      const ws = utils.json_to_sheet(filtered.map((m, i) => ({
        "#": i + 1,
        "Full Name": m.fullName,
        "Club": m.clubName ?? "",
        "Age": m.age,
        "Gender": m.gender,
        "Phone": m.phoneNumber,
        "Joined": new Date(m.createdAt).toLocaleDateString(),
      })));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Members");
      writeFile(wb, "members.xlsx");
    });
  };

  return (
    <ProtectedLayout allowedRole="admin">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Members</h1>
            <p className="text-muted-foreground mt-1">{total} member{total !== 1 ? "s" : ""} across all clubs</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2 shrink-0">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={clubFilter} onValueChange={v => { setClubFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Clubs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubsData?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={genderFilter} onValueChange={v => { setGenderFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Genders" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="hidden md:table-cell">Age</TableHead>
                    <TableHead className="hidden md:table-cell">Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="py-12 flex flex-col items-center text-muted-foreground">
                            <Users className="w-10 h-10 mb-3 opacity-30" />
                            <p>No members found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                    : filtered.map((m, i) => (
                        <TableRow key={m.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="text-muted-foreground text-sm">{(page - 1) * limit + i + 1}</TableCell>
                          <TableCell className="font-medium">{m.fullName}</TableCell>
                          <TableCell><Badge variant="secondary">{m.clubName ?? "—"}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell">{m.age}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={
                              m.gender === "Female" ? "border-pink-400 text-pink-600 dark:text-pink-400" :
                              m.gender === "Male" ? "border-blue-400 text-blue-600 dark:text-blue-400" : ""
                            }>{m.gender}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{m.phoneNumber}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                  }
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm font-medium">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </ProtectedLayout>
  );
}
