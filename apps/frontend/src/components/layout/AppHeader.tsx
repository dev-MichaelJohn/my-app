import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserNav } from "./UserNav";
import { useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { Skeleton } from "@/components/ui/skeleton";
import { AppBreadcrumbs } from "./AppBreadcrumbs";

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
}

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  const { data: activeSemester, isLoading } = useActiveSemester();

  return (
    <header className="h-16 w-full border-b border-border bg-background/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <AppBreadcrumbs />
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {isLoading ? (
          <Skeleton className="hidden sm:block h-7 w-48 rounded-md bg-muted/60" />
        ) : activeSemester ? (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              A.Y. {activeSemester.school_year_start}-{activeSemester.school_year_end} |{" "}
              {activeSemester.semester_term} Sem
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
            <span>No Active Semester</span>
          </div>
        )}

        <div className="h-5 w-px bg-border hidden sm:block"></div>

        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
