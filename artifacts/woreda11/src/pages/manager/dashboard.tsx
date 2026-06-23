import React from "react";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManagerDashboard() {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <ProtectedLayout allowedRole="manager">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Good morning, {user?.fullName?.split(' ')[0]}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {user?.clubId ? "Club Active" : "No Club Assigned"}
              </span>
              <span>•</span>
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <motion.div variants={itemVariants}>
          <Card className="bg-primary text-primary-foreground border-primary-border relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
              <CheckCircle className="w-64 h-64" />
            </div>
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div>
                <h2 className="text-2xl font-bold mb-2">Today's Attendance</h2>
                <p className="text-primary-foreground/80 max-w-md">
                  You haven't submitted attendance for today yet. Please submit it to keep your club's records up to date.
                </p>
              </div>
              <Button size="lg" variant="secondary" className="shrink-0 text-primary whitespace-nowrap font-bold">
                Submit Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">-</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">-</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unread News</CardTitle>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">-</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </ProtectedLayout>
  );
}
