import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Shield, Check, Lock } from "lucide-react";
import { SystemRoles, type GetUser, type SystemRole } from "@my-app/shared";
import { useManageRoles } from "../hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import type { ApiError } from "@/lib/api.lib";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: GetUser;
}

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  SYS_ADMIN: "Full system administration, environment control, and security access.",
  ADMIN: "Manages institutional setups, curriculums, classes, schedules, and user accounts.",
  SUPERVISOR: "Academic Dean or Program Chair evaluating faculty performance & reviewing MOVs.",
  FACULTY: "Instructors teaching courses and receiving student performance evaluations.",
  STUDENT: "Enrolled student submitting teacher evaluations (SET).",
};

export function ManageRolesDialog({ open, onOpenChange, user }: Props) {
  const { hasRole } = usePermissions();
  const isSysAdmin = hasRole("SYS_ADMIN");
  const manageRolesMutation = useManageRoles();

  const [selectedRoles, setSelectedRoles] = useState<SystemRole[]>(() => [...user.roles]);

  // Check active offices held
  const deanships = user.offices?.deanships || [];
  const chairships = user.offices?.chairships || [];
  const isHoldingOffice = deanships.length > 0 || chairships.length > 0;

  const officeLabels: string[] = [];
  if (deanships.length > 0)
    officeLabels.push(`Dean of ${deanships.map((d) => d.initialism).join(", ")}`);
  if (chairships.length > 0)
    officeLabels.push(`Chair of ${chairships.map((c) => c.initialism).join(", ")}`);

  const toggleRole = (role: SystemRole) => {
    // Office Protection: Cannot remove SUPERVISOR if holding Dean or Chair office
    if (role === "SUPERVISOR" && isHoldingOffice && selectedRoles.includes("SUPERVISOR")) {
      toast.warning(
        `Cannot revoke SUPERVISOR role: User is currently an active ${officeLabels.join(" and ")}.`,
      );
      return;
    }

    if (role === "STUDENT") {
      // Selecting STUDENT deselects all other roles (mutually exclusive)
      setSelectedRoles(["STUDENT"]);
      return;
    }

    // Selecting any non-student role removes STUDENT automatically
    setSelectedRoles((prev) => {
      const withoutStudent = prev.filter((r) => r !== "STUDENT");
      if (withoutStudent.includes(role)) {
        return withoutStudent.filter((r) => r !== role);
      }
      return [...withoutStudent, role];
    });
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast.error("User must have at least one assigned system role.");
      return;
    }

    try {
      await manageRolesMutation.mutateAsync({
        id: user.account.id,
        roles: selectedRoles,
      });
      toast.success(`Roles updated for ${user.details.first_name} ${user.details.last_name}.`);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to update roles.");
    }
  };

  const availableRoles = isSysAdmin
    ? SystemRoles.enumValues
    : SystemRoles.enumValues.filter((r) => r !== "ADMIN" && r !== "SYS_ADMIN");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <span>Manage System Roles</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Assign or revoke system capabilities for{" "}
            <strong>
              {user.details.first_name} {user.details.last_name}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        {isHoldingOffice && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2.5 text-xs text-foreground">
            <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Active Academic Office:</strong> This account is currently appointed as{" "}
              <strong>{officeLabels.join(" and ")}</strong>. The <code>SUPERVISOR</code> role is
              locked and cannot be removed until the office is reassigned or vacated.
            </span>
          </div>
        )}

        <div className="space-y-2.5 py-2">
          {availableRoles.map((role) => {
            const isAssigned = selectedRoles.includes(role);
            const isLockedSupervisor = role === "SUPERVISOR" && isHoldingOffice;

            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-all",
                  isAssigned
                    ? "border-primary/50 bg-primary/5 shadow-2xs"
                    : "border-border bg-background hover:bg-muted/40",
                  isLockedSupervisor && "opacity-90",
                )}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{role}</span>
                    {isAssigned && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1.5">
                        Active
                      </Badge>
                    )}
                    {isLockedSupervisor && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary text-[10px] h-4 px-1.5 gap-1"
                      >
                        <Lock className="w-2.5 h-2.5" /> Office Held
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>

                <div
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition",
                    isAssigned
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-background",
                  )}
                >
                  {isAssigned && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={manageRolesMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedRoles.length === 0 || manageRolesMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {manageRolesMutation.isPending ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              "Apply Roles"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
