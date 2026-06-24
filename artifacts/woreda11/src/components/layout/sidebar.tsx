import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  FileText, 
  Newspaper, 
  LogOut,
  X,
  UserCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ className, isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clubs", label: "Clubs", icon: ShieldCheck },
    { href: "/admin/members", label: "Members", icon: Users },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/news", label: "News", icon: Newspaper },
  ];

  const managerLinks = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manager/members", label: "Members", icon: Users },
    { href: "/manager/attendance", label: "Attendance", icon: ShieldCheck },
    { href: "/manager/news", label: "News", icon: Newspaper },
  ];

  const links = user?.role === "admin" ? adminLinks : managerLinks;
  const profileLink = user?.role === "admin" ? "/admin/profile" : "/manager/profile";

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
            <span className="font-bold text-lg text-sidebar-foreground truncate tracking-tight">Woreda 11</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-sidebar-border/50 bg-sidebar-accent/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href || (location.startsWith(link.href) && link.href !== "/admin" && link.href !== "/manager");
            
            return (
              <Link key={link.href} href={link.href}>
                <span className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )} onClick={() => setIsOpen(false)}>
                  <Icon className="w-5 h-5" />
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link href={profileLink}>
            <span className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              location === profileLink
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              <UserCircle className="w-5 h-5" />
              Profile
            </span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
