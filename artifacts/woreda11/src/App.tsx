import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import PrivacyPolicy from "@/pages/privacy";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminClubs from "@/pages/admin/clubs";
import AdminClubMembers from "@/pages/admin/club-members";
import AdminMembers from "@/pages/admin/members";
import AdminReports from "@/pages/admin/reports";
import AdminNews from "@/pages/admin/news";
import AdminProfile from "@/pages/admin/profile";

import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerMembers from "@/pages/manager/members";
import ManagerAttendance from "@/pages/manager/attendance";
import ManagerNews from "@/pages/manager/news";
import ManagerProfile from "@/pages/manager/profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <LoginPage />} />
      <Route path="/login" component={LoginPage} />
      
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/clubs" component={AdminClubs} />
      <Route path="/admin/clubs/:clubId/members" component={AdminClubMembers} />
      <Route path="/admin/members" component={AdminMembers} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/news" component={AdminNews} />
      <Route path="/admin/profile" component={AdminProfile} />
      
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/members" component={ManagerMembers} />
      <Route path="/manager/attendance" component={ManagerAttendance} />
      <Route path="/manager/news" component={ManagerNews} />
      <Route path="/manager/profile" component={ManagerProfile} />
      
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
