import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Shield,
  KeyRound,
  Mail,
  CheckCircle2,
  Building2,
  GraduationCap,
} from "lucide-react";
import type { GetUser } from "@my-app/shared";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  users: GetUser[];
  isArchivedView: boolean;
  onEdit: (user: GetUser) => void;
  onManageRoles: (user: GetUser) => void;
  onResetPassword: (user: GetUser) => void;
  onResendWelcome: (user: GetUser) => void;
  onDelete: (user: GetUser) => void;
  onRestore: (user: GetUser) => void;
}

export function UserGridView({
  users,
  isArchivedView,
  onEdit,
  onManageRoles,
  onResetPassword,
  onResendWelcome,
  onDelete,
  onRestore,
}: Props) {
  const { user: currentUser, hasRole } = usePermissions();
  const isSysAdmin = hasRole("SYS_ADMIN");

  if (users.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No user accounts found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((item) => {
        const isSelf = currentUser?.account.id === item.account.id;
        const isTargetAdmin = item.roles.includes("ADMIN") || item.roles.includes("SYS_ADMIN");
        const canManageTarget = isSysAdmin || !isTargetAdmin || isSelf;

        const fullName = `${item.details.last_name}, ${item.details.first_name}${
          item.details.suffix ? ` ${item.details.suffix}` : ""
        }`;

        return (
          <Card
            key={item.account.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {item.details.first_name[0]}
                  {item.details.last_name[0]}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground truncate">{fullName}</h3>
                    {isSelf && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-primary/40 text-primary"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.details.institutional_id}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 border-border bg-popover text-popover-foreground"
                >
                  {!isArchivedView ? (
                    <>
                      {canManageTarget ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit Account</span>
                          </DropdownMenuItem>
                          {isSysAdmin && (
                            <DropdownMenuItem
                              onClick={() => onManageRoles(item)}
                              className="gap-2 cursor-pointer"
                            >
                              <Shield className="w-4 h-4 text-primary" />
                              <span>Manage Roles</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onResetPassword(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4 text-amber-500" />
                            <span>Reset Password</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onResendWelcome(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>Resend Credentials</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                          Managed by Sys Admin
                        </DropdownMenuItem>
                      )}

                      {!isSelf && canManageTarget && (
                        <>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Archive Account</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onRestore(item)}
                      className="gap-2 text-primary cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore Account</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent className="space-y-2.5 pt-1">
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1.5 text-xs">
                <p className="text-muted-foreground truncate">{item.account.email}</p>
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {item.roles.map((r) => (
                    <Badge
                      key={r}
                      variant="secondary"
                      className="font-bold text-[10px] px-1.5 py-0.5"
                    >
                      {r}
                    </Badge>
                  ))}
                  {item.offices?.deanships?.map((d) => (
                    <Badge
                      key={d.id}
                      className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px] px-1.5 py-0.5 gap-1"
                    >
                      <Building2 className="w-3 h-3" /> Dean of {d.initialism}
                    </Badge>
                  ))}
                  {item.offices?.chairships?.map((c) => (
                    <Badge
                      key={c.id}
                      className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold text-[10px] px-1.5 py-0.5 gap-1"
                    >
                      <GraduationCap className="w-3 h-3" /> Chair of {c.initialism}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Account #{item.account.id}</span>
              {item.account.is_verified ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span>Unverified</span>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
