import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardOverview, useLiveEvaluationPulse } from "../hooks/useDashboards";
import { AdminDashboardView } from "../components/AdminDashboardView";
import { DeanChairDashboardView } from "../components/DeanChairDashboardView";
import { FacultyDashboardView } from "../components/FacultyDashboardView";
import { StudentDashboardView } from "../components/StudentDashboardView";
import { Spinner } from "@/components/ui/spinner";
import { Building2, GraduationCap } from "lucide-react";

export default function DashboardPage() {
  const { user, isSysAdmin, isAdmin, isDean, isChair, isFaculty, isStudent } = usePermissions();
  const isPrivilegedAdmin = isSysAdmin || isAdmin;

  // Overview Query
  const { data, isLoading } = useDashboardOverview();

  // Real-Time Socket.IO pulse stream
  const pulses = useLiveEvaluationPulse(data?.recentPulses ?? []);

  // Multi-role switcher for Dean/Chair who also teaches
  const [activeViewMode, setActiveViewMode] = useState<"SUPERVISORY" | "TEACHING">("SUPERVISORY");

  if (isLoading || !data || !user) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-muted-foreground animate-pulse">
          Loading dashboard telemetry...
        </p>
      </div>
    );
  }

  // 1. Admin / Superadmin View
  if (isPrivilegedAdmin) {
    return <AdminDashboardView data={data} pulses={pulses} />;
  }

  // 2. Dean / Program Chair View
  if (isDean || isChair) {
    return (
      <div className="space-y-4">
        {/* Toggle between supervisory cockpit and teaching courses */}
        {isFaculty && (
          <div className="flex justify-end gap-1.5 pb-2 border-b border-border">
            <button
              onClick={() => setActiveViewMode("SUPERVISORY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeViewMode === "SUPERVISORY"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isDean ? "Dean Cockpit" : "Chair Cockpit"}</span>
            </button>
            <button
              onClick={() => setActiveViewMode("TEACHING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeViewMode === "TEACHING"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>My Teaching Hub</span>
            </button>
          </div>
        )}

        {activeViewMode === "SUPERVISORY" ? (
          <DeanChairDashboardView
            user={user}
            data={data}
            pulses={pulses}
            isDean={isDean}
            isChair={isChair}
          />
        ) : (
          <FacultyDashboardView user={user} data={data} />
        )}
      </div>
    );
  }

  // 3. Faculty Member View
  if (isFaculty) {
    return <FacultyDashboardView user={user} data={data} />;
  }

  // 4. Student View
  if (isStudent) {
    return <StudentDashboardView user={user} data={data} />;
  }

  // Default fallback
  return <AdminDashboardView data={data} pulses={pulses} />;
}
