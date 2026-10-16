import { useState } from "react";
import { useAuditLogs, useRollbackAudit } from "../hooks/useAuditLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { AuditDiffViewer } from "../components/AuditDiffViewer";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  History,
  RotateCcw,
  Search,
  ShieldCheck,
  Eye,
  CheckCircle2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Layers,
} from "lucide-react";
import type { IAuditLogSelect } from "@my-app/shared";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [rollbackEntireTx, setRollbackEntireTx] = useState(true);

  const { data: response, isLoading } = useAuditLogs({
    search: search || undefined,
    entity: entityFilter || undefined,
    page,
    limit: 15,
  });

  const rollbackMutation = useRollbackAudit();

  const auditLogs = response?.data ?? [];
  const pagination = response?.pagination;

  const [activeDiffLog, setActiveDiffLog] = useState<IAuditLogSelect | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<IAuditLogSelect | null>(null);

  const handleRollbackConfirm = async () => {
    if (!rollbackTarget) return;

    try {
      const res = await rollbackMutation.mutateAsync({
        id: rollbackTarget.id,
        rollbackEntireTransaction: rollbackEntireTx,
      });
      toast.success(res.message);
      setRollbackTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Rollback failed.");
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-success/15 text-success border-success/30">CREATE</Badge>;
      case "UPDATE":
        return <Badge className="bg-info/15 text-info border-info/30">UPDATE</Badge>;
      case "DELETE":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30">DELETE</Badge>
        );
      case "RESTORE":
        return <Badge className="bg-primary/15 text-primary border-primary/30">RESTORE</Badge>;
      case "ROLLBACK":
        return <Badge className="bg-warning/15 text-warning border-warning/30">ROLLBACK</Badge>;
      case "STATUS_CHANGE":
        return (
          <Badge variant="outline" className="text-chart-2 border-chart-2/30">
            STATUS
          </Badge>
        );
      case "ROLE_CHANGE":
        return (
          <Badge variant="outline" className="text-primary border-primary/30">
            ROLES
          </Badge>
        );
      case "PASSWORD_RESET":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30">
            PASS_RESET
          </Badge>
        );
      case "BULK_IMPORT":
        return <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30">BULK_IMPORT</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            <span>Audit Trail & Rollback Control</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable log of all administrative actions with atomic multi-table transaction
            rollback.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Non-repudiable Event Ledger</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-muted/30 border border-border rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor email, name, or entity..."
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <Select
          value={entityFilter || "all"}
          onValueChange={(val) => setEntityFilter(val && val !== "all" ? val : undefined)}
        >
          <SelectTrigger className="w-full sm:w-48 h-9 text-xs bg-card">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="colleges">Colleges</SelectItem>
            <SelectItem value="programs">Programs</SelectItem>
            <SelectItem value="courses">Courses</SelectItem>
            <SelectItem value="classes">Classes</SelectItem>
            <SelectItem value="curriculums">Curriculums</SelectItem>
            <SelectItem value="faculties">Faculties</SelectItem>
            <SelectItem value="offerings">Offerings</SelectItem>
            <SelectItem value="class_students">Class Rosters</SelectItem>
            <SelectItem value="student_classes">Course Enrollments</SelectItem>
            <SelectItem value="semesters">Semesters</SelectItem>
            <SelectItem value="accounts">User Accounts</SelectItem>
            <SelectItem value="student_evaluation_schedules">SET Schedules</SelectItem>
            <SelectItem value="supervisor_evaluation_schedules">SEF Schedules</SelectItem>
            <SelectItem value="individual_faculty_reports">Evaluation Reports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Ledger Table ── */}
      <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-12 font-bold">#</TableHead>
                <TableHead className="font-bold">Timestamp</TableHead>
                <TableHead className="font-bold">Actor</TableHead>
                <TableHead className="font-bold">Action</TableHead>
                <TableHead className="font-bold">Entity</TableHead>
                <TableHead className="font-bold">Target Record</TableHead>
                <TableHead className="font-bold">Tx Group</TableHead>
                <TableHead className="text-right font-bold w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-xs text-muted-foreground"
                  >
                    No audit records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="text-xs border-border hover:bg-muted/30 transition"
                  >
                    <TableCell className="font-mono text-muted-foreground">{log.id}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{log.actor_name}</p>
                      <p className="text-[10px] text-muted-foreground">{log.actor_email}</p>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {log.entity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-[160px] truncate">
                      {log.entity_name}
                    </TableCell>
                    <TableCell>
                      {log.transaction_id ? (
                        <span
                          className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted max-w-[70px] truncate block"
                          title={`Transaction ID: ${log.transaction_id}`}
                        >
                          {log.transaction_id.slice(0, 8)}…
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {log.diff && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setActiveDiffLog(log)}
                            title="Inspect Changed Values"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {log.is_rollbackable &&
                          !log.rolled_back_at &&
                          log.action !== "ROLLBACK" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRollbackTarget(log);
                                setRollbackEntireTx(Boolean(log.transaction_id));
                              }}
                              className="h-7 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rollback</span>
                            </Button>
                          )}

                        {log.rolled_back_at && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-success" /> Reverted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Total: <strong className="text-foreground">{pagination.totalItems}</strong> event(s)
          </span>

          <div className="flex items-center gap-1.5">
            <span>
              Page {pagination.currentPage} of {pagination.totalPage}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={!pagination.hasNext}
              onClick={() => setPage(pagination.totalPage)}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── State Diff Inspector Modal ── */}
      {activeDiffLog && (
        <Dialog
          open={Boolean(activeDiffLog)}
          onOpenChange={(open) => !open && setActiveDiffLog(null)}
        >
          <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-border bg-card text-card-foreground">
            <DialogHeader className="pb-3 border-b border-border">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="w-4.5 h-4.5 text-primary" />
                <span className="truncate">State Diff: {activeDiffLog.entity_name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 pt-0.5">
                <span>
                  Action: <strong className="text-foreground">{activeDiffLog.action}</strong> on{" "}
                  <strong className="text-foreground uppercase">{activeDiffLog.entity}</strong>
                </span>
                {activeDiffLog.transaction_id && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[10px]">
                      Tx ID: {activeDiffLog.transaction_id}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2">
              <AuditDiffViewer diff={activeDiffLog.diff} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Rollback Confirmation Modal with Transaction Toggle ── */}
      <ConfirmActionDialog
        open={Boolean(rollbackTarget)}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
        title={`Rollback ${rollbackTarget?.action} on ${rollbackTarget?.entity_name}?`}
        description={
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              This will revert <strong>{rollbackTarget?.entity_name}</strong> back to its pre-action
              state inside an atomic database transaction.
            </p>

            {rollbackTarget?.transaction_id && (
              <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Transaction Group Detected</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This action was part of an atomic multi-table transaction (
                  <code className="text-[10px]">{rollbackTarget.transaction_id.slice(0, 8)}…</code>
                  ). Rolling back the entire transaction will safely revert all associated
                  operations in reverse dependency order.
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground pt-1">
                  <input
                    type="checkbox"
                    checked={rollbackEntireTx}
                    onChange={(e) => setRollbackEntireTx(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Rollback all related changes in this transaction</span>
                </label>
              </div>
            )}
          </div>
        }
        confirmLabel="Confirm Rollback"
        variant="destructive"
        isLoading={rollbackMutation.isPending}
        onConfirm={handleRollbackConfirm}
      />
    </div>
  );
}
