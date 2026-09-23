import { useState, useRef, useEffect } from "react";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { LogOut } from "lucide-react";

export function UserNav() {
  const { user, roles } = usePermissions();
  const logoutMutation = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const fullName = `${user.details.first_name} ${user.details.last_name}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {user.details.first_name[0]}
          {user.details.last_name[0]}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold leading-none text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user.details.institutional_id}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-bold text-foreground">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.account.email}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {roles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              logoutMutation.mutate();
            }}
            disabled={logoutMutation.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition font-medium text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
