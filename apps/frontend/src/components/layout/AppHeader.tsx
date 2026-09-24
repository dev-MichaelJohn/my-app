import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserNav } from "./UserNav";
import { useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { Skeleton } from "../ui/skeleton";

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
}

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  const { data: activeSemester, isLoading } = useActiveSemester();

  return (
    <header className="h-16 w-full border-b border-border bg-background/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isLoading ? (
          <Skeleton className="hidden sm:block h-7 w-48 rounded-md bg-muted/60" />
        ) : activeSemester ? (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              A.Y. {activeSemester.school_year_start}-{activeSemester.school_year_end} |{" "}
              {activeSemester.semester_term} Semester
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
            <span>No Active Semester</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <div className="h-6 w-px bg-border hidden sm:block"></div>
        <UserNav />
      </div>
    </header>
  );
}
