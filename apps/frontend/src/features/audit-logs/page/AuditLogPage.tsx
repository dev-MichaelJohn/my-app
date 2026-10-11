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
} from "lucide-react";
import type { IAuditLogSelect } from "@my-app/shared";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

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
      const res = await rollbackMutation.mutateAsync(rollbackTarget.id);
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
      case "ROLLBACK":
        return <Badge className="bg-warning/15 text-warning border-warning/30">ROLLBACK</Badge>;
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
            Immutable log of all administrative actions with point-in-time state reversion.
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
            <SelectItem value="users">Users</SelectItem>
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
                <TableHead className="text-right font-bold w-[130px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
                    <TableCell className="font-medium text-foreground max-w-[180px] truncate">
                      {log.entity_name}
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
                              onClick={() => setRollbackTarget(log)}
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
                            <CheckCircle2 className="w-3 h-3 text-success" /> Rolled Back
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
          <DialogContent className="sm:max-w-xl border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>State Diff Inspector — {activeDiffLog.entity_name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Captured before-and-after values for this {activeDiffLog.action} action on{" "}
                {activeDiffLog.entity}.
              </DialogDescription>
            </DialogHeader>

            <AuditDiffViewer diff={activeDiffLog.diff} />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Rollback Confirmation Modal ── */}
      <ConfirmActionDialog
        open={Boolean(rollbackTarget)}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
        title={`Rollback ${rollbackTarget?.action} on ${rollbackTarget?.entity_name}?`}
        description={
          <span>
            This will revert <strong>{rollbackTarget?.entity_name}</strong> back to its state prior
            to this action. A permanent audit log entry of this rollback will be added to the
            ledger.
          </span>
        }
        confirmLabel="Confirm Rollback"
        variant="destructive"
        isLoading={rollbackMutation.isPending}
        onConfirm={handleRollbackConfirm}
      />
    </div>
  );
}
