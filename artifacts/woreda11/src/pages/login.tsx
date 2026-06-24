import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && user) {
      setLocation(user.role === "admin" ? "/admin" : "/manager");
    }
  }, [user, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login?returnTo=" + encodeURIComponent(window.location.pathname === "/login" ? "/" : window.location.pathname);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0a1517]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] animate-pulse" style={{ animationDuration: "12s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl bg-surface/80 backdrop-blur-xl border border-primary/20 shadow-2xl relative z-10 mx-4"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 p-2">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Woreda 11</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Club Attendance Management Platform
          </p>
          <p className="text-white/40 mt-1 text-center text-xs">
            Addis Ababa City Administration — Bureau of Youth and Sport
          </p>
        </div>

        <Button
          onClick={handleLogin}
          className="w-full h-12 text-base font-semibold shadow-lg hover-elevate transition-all duration-200 active:scale-[0.98] gap-3"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-current"
            aria-hidden="true"
          >
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2.4a7.6 7.6 0 1 1 0 15.2A7.6 7.6 0 0 1 12 4.4zm-1.6 3.2v4.8H8L12 16l4-3.6h-2.4V7.6h-3.2z" />
          </svg>
          Sign in with Replit
        </Button>

        <p className="mt-6 text-center text-xs text-white/30">
          Access is managed by your organisation. Contact your administrator if
          you cannot sign in.
        </p>
      </motion.div>
    </div>
  );
}
