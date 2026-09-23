import { useState } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { X } from "lucide-react";

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* ── 1. Desktop Sidebar (Sticky) ── */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0">
        <AppSidebar />
      </div>

      {/* ── 2. Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-sidebar h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-sidebar-foreground hover:bg-sidebar-accent rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
            <AppSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* ── 3. Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
