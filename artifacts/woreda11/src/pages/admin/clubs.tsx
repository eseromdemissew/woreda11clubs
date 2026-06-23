import React from "react";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useListClubs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Plus, Users, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";

export default function AdminClubs() {
  const { data: clubs, isLoading } = useListClubs();
  const [search, setSearch] = React.useState("");

  const filteredClubs = clubs?.filter(club => 
    club.name.toLowerCase().includes(search.toLowerCase()) || 
    club.managerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedLayout allowedRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clubs</h1>
            <p className="text-muted-foreground mt-1">Manage all youth sports clubs in Woreda 11.</p>
          </div>
          <Button className="shrink-0 gap-2">
            <Plus className="w-4 h-4" /> Add Club
          </Button>
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search clubs or managers..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClubs?.map((club) => (
              <Card key={club.id} className="hover-elevate transition-all overflow-hidden flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {club.iconUrl ? (
                        <img src={club.iconUrl} alt={club.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <ShieldIcon className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <Badge variant={club.isActive ? "default" : "secondary"} className={club.isActive ? "bg-success hover:bg-success" : ""}>
                      {club.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-bold text-lg leading-tight mb-1">{club.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Manager: <span className="font-medium text-foreground">{club.managerName || "Unassigned"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3"/> Members</span>
                      <span className="font-semibold">{club.memberCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> Sessions</span>
                      <span className="font-semibold">{club.sessionCount}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/admin/clubs/${club.id}/members`}>Members</Link>
                    </Button>
                    <Button variant="outline" className="flex-1">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}

function ShieldIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
