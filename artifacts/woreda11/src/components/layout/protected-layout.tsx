import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface LayoutProps {
  children: React.ReactNode;
  allowedRole: "admin" | "manager";
}

export function ProtectedLayout({ children, allowedRole }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (user.role !== allowedRole) {
        setLocation(user.role === "admin" ? "/admin" : "/manager");
      }
    }
  }, [user, isLoading, setLocation, allowedRole]);

  if (isLoading || !user || user.role !== allowedRole) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">
        <TopNav onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
