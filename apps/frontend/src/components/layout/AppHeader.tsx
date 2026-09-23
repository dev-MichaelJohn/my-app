import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserNav } from "./UserNav";

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
}

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  return (
    <header className="h-16 w-full border-b border-border bg-background/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Academic Year Banner */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-medium text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>A.Y. 2025-2026 | 2nd Semester</span>
        </div>
      </div>

      {/* Right Controls: Theme + User Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <div className="h-6 w-px bg-border hidden sm:block"></div>
        <UserNav />
      </div>
    </header>
  );
}
