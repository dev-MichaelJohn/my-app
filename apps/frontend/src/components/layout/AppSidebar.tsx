import { NavLink } from "react-router";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, type Permission } from "@my-app/shared";
import {
  Building2,
  GraduationCap,
  BookOpen,
  Layers,
  School,
  CalendarDays,
  FileCheck2,
  FileSpreadsheet,
  Users,
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Calendar,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  anyPermissions?: Permission[];
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    heading: "Institutional Setup",
    items: [
      {
        title: "Semesters",
        href: "/admin/semesters",
        icon: Calendar,
        permission: PERMISSIONS.SEMESTER_READ,
      },
      {
        title: "Colleges",
        href: "/admin/colleges",
        icon: Building2,
        permission: PERMISSIONS.COLLEGE_READ,
      },
      {
        title: "Academic Programs",
        href: "/admin/programs",
        icon: GraduationCap,
        permission: PERMISSIONS.PROGRAM_READ,
      },
      {
        title: "Courses",
        href: "/admin/courses",
        icon: BookOpen,
        permission: PERMISSIONS.COURSE_READ,
      },
      {
        title: "Curriculums",
        href: "/admin/curriculums",
        icon: Layers,
        permission: PERMISSIONS.COURSE_CURRICULUM_READ,
      },
      {
        title: "Classes",
        href: "/admin/classes",
        icon: School,
        permission: PERMISSIONS.CLASS_READ,
      },
    ],
  },
  {
    heading: "Academic Operations",
    items: [
      {
        title: "Course Offerings",
        href: "/admin/offerings",
        icon: CalendarDays,
        permission: PERMISSIONS.COURSE_OFFERING_READ,
      },
      {
        title: "Class Rosters",
        href: "/admin/rosters",
        icon: Users,
        permission: PERMISSIONS.CLASS_STUDENT_READ,
      },
    ],
  },
  {
    heading: "Evaluation Suite",
    items: [
      {
        title: "Evaluation Schedules",
        href: "/admin/evaluation-periods",
        icon: CalendarDays,
        permission: PERMISSIONS.EVALUATION_PERIOD_READ,
      },
      {
        title: "Evaluation Instruments",
        href: "/admin/evaluation-forms",
        icon: ClipboardList,
        permission: PERMISSIONS.EVALUATION_FORM_READ,
      },
      {
        title: "Evaluate Instructors",
        href: "/evaluations/student",
        icon: FileCheck2,
        permission: PERMISSIONS.EVALUATION_SUBMIT_SET,
      },
      {
        title: "Supervisor Evaluation",
        href: "/evaluations/supervisor",
        icon: UserCheck,
        permission: PERMISSIONS.EVALUATION_SUBMIT_SEF,
      },
    ],
  },
  {
    heading: "Reports & Analytics",
    items: [
      {
        title: "IFER & FEDAF Reports",
        href: "/reports/faculty",
        icon: FileSpreadsheet,
        anyPermissions: [
          PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
          PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
        ],
      },
    ],
  },
  {
    heading: "System Administration",
    items: [
      {
        title: "User Accounts",
        href: "/admin/users",
        icon: Users,
        permission: PERMISSIONS.ACCOUNT_READ,
      },
    ],
  },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return (
    <aside className="w-64 h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-sm">
          PIT
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground">PIT-FES</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">
            Evaluation System
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Main Dashboard Link */}
        <div>
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* Dynamic Role-Filtered Sections */}
        {NAVIGATION_SECTIONS.map((section) => {
          // Filter items based on permissions
          const visibleItems = section.items.filter((item) => {
            if (item.permission) return hasPermission(item.permission);
            if (item.anyPermissions) return hasAnyPermission(item.anyPermissions);
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.heading} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {section.heading}
              </h3>
              <div className="space-y-0.5 pt-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
