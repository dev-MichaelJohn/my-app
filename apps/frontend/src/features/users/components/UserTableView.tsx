import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  RotateCcw,
  ShieldAlert,
  KeyRound,
  Shield,
  Mail,
  CheckCircle2,
  XCircle,
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

export function UserTableView({
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
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">User / Full Name</TableHead>
            <TableHead className="font-bold">Institutional ID</TableHead>
            <TableHead className="font-bold">Assigned Roles & Offices</TableHead>
            <TableHead className="w-[120px] font-bold">Verification</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((item) => {
            const isSelf = currentUser?.account.id === item.account.id;
            const isTargetAdmin = item.roles.includes("ADMIN") || item.roles.includes("SYS_ADMIN");
            const canManageTarget = isSysAdmin || !isTargetAdmin || isSelf;

            const fullName = `${item.details.last_name}, ${item.details.first_name}${
              item.details.suffix ? ` ${item.details.suffix}` : ""
            }`;

            return (
              <TableRow
                key={item.account.id}
                className="border-border hover:bg-muted/30 transition"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {item.details.first_name[0]}
                      {item.details.last_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {fullName}
                        </p>
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-primary/40 text-primary"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.account.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono font-bold text-foreground">
                    {item.details.institutional_id}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
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
                </TableCell>
                <TableCell>
                  {item.account.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <XCircle className="w-3.5 h-3.5 opacity-60" /> Unverified
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
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
                            <DropdownMenuItem
                              disabled
                              className="text-xs text-muted-foreground italic"
                            >
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
                          className="gap-2 text-primary focus:bg-primary/10 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore Account</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
