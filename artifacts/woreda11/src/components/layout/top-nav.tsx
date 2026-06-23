import React, { useState, useEffect } from "react";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const [time, setTime] = useState(new Date());
  const [location] = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simple breadcrumb logic based on route
  const getPageTitle = () => {
    const parts = location.split("/").filter(Boolean);
    if (parts.length === 0) return "Dashboard";
    if (parts.length === 1) return "Dashboard";
    
    // Capitalize last part
    const last = parts[parts.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>{location.includes("/admin") ? "Admin" : "Manager"}</span>
          <span>/</span>
          <span className="text-foreground">{getPageTitle()}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="hidden sm:block font-medium tabular-nums text-muted-foreground">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-surface"></span>
        </Button>
      </div>
    </header>
  );
}
