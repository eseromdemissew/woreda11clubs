import React from "react";
import { motion } from "framer-motion";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, Activity, UserCheck } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: { retry: false, queryKey: getGetAdminStatsQueryKey() }
  });

  const kpis = [
    {
      title: "Total Clubs",
      value: stats?.totalClubs || 0,
      icon: ShieldCheck,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Submitted Today",
      value: `${stats?.clubsSubmittedToday || 0} / ${stats?.totalClubsToday || 0}`,
      icon: Activity,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Active Managers",
      value: stats?.activeManagers || 0,
      icon: UserCheck,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <ProtectedLayout allowedRole="admin">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Woreda 11 attendance at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="hover-elevate transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                    <div className={`w-8 h-8 rounded-full ${kpi.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {isLoading ? "-" : kpi.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Placeholders for Charts & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle>Attendance Trends (30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center text-muted-foreground h-[300px]">
                Chart rendering coming soon...
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-[300px]">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>Activity feed coming soon...</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </ProtectedLayout>
  );
}
