// Protected layout wrapper with sidebar navigation
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Mountain } from "lucide-react";

export default function AppLayout() {
  const { user, loading, profile } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Mountain className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header bar */}
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t py-3 px-6 text-center text-xs text-muted-foreground">
            Built using Convolutional Neural Network (CNN) and SHAP (Explainable AI)
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
