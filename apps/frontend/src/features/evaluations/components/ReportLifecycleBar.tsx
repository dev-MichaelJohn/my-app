import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, SendHorizontal, RefreshCw, ArrowLeft, Layers, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Can } from "@/components/Can";
import {
  PERMISSIONS,
  type AnnexCFacultyReport,
  type GetUser,
  type ReportStatus,
} from "@my-app/shared";
import { downloadAnnexCPdf, downloadAnnexDPdf } from "../lib/report-export.lib";

interface Props {
  report: AnnexCFacultyReport;
  currentUser?: GetUser | null;
  onBack: () => void;
  onStatusChange: (nextStatus: ReportStatus) => Promise<void>;
  onRecalculate: () => Promise<void>;
  onBatchConsolidateClick: () => void;
  isRecalculating: boolean;
}

export function ReportLifecycleBar({
  report,
  currentUser,
  onBack,
  onStatusChange,
  onRecalculate,
  onBatchConsolidateClick,
  isRecalculating,
}: Props) {
  const isOwnReport = report.faculty_id === currentUser?.account.id;

  const [targetStatus, setTargetStatus] = useState<ReportStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirm = async () => {
    if (!targetStatus) return;
    setIsUpdating(true);
    await onStatusChange(targetStatus);
    setIsUpdating(false);
    setTargetStatus(null);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-2xl">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onBack}
          className="h-8 text-xs gap-1.5 border-border"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to List</span>
        </Button>

        <span className="text-xs text-muted-foreground">Status:</span>
        <Badge
          variant="outline"
          className={`text-xs font-bold uppercase ${
            report.status === "PUBLISHED"
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : report.status === "FINALIZED"
                ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          }`}
        >
          {report.status}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* 🔒 Lifecycle controls hidden when viewing own report */}
        {!isOwnReport && (
          <Can permission={PERMISSIONS.EVALUATION_REPORT_MANAGE_STATUS}>
            {report.status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTargetStatus("FINALIZED")}
                className="h-8 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finalize</span>
              </Button>
            )}

            {report.status === "FINALIZED" && (
              <Button
                size="sm"
                onClick={() => setTargetStatus("PUBLISHED")}
                className="h-8 text-xs gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>Publish</span>
              </Button>
            )}

            {report.status === "PUBLISHED" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTargetStatus("DRAFT")}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Revert
              </Button>
            )}
          </Can>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="h-8 text-xs gap-1 hover:bg-background"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
          <span>Recalculate</span>
        </Button>

        <Can permission={PERMISSIONS.EVALUATION_REPORT_BATCH_GENERATE}>
          <Button
            size="sm"
            variant="outline"
            onClick={onBatchConsolidateClick}
            className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Refresh</span>
          </Button>
        </Can>

        {/* ── Official Download Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Documents</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-xs">
            <DropdownMenuItem
              onClick={() => downloadAnnexCPdf(report)}
              className="cursor-pointer gap-2 py-2"
            >
              <span className="font-bold text-primary">Annex C</span>
              <span>— Official Report (IFER)</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => downloadAnnexDPdf(report)}
              className="cursor-pointer gap-2 py-2"
            >
              <span className="font-bold text-emerald-600">Annex D</span>
              <span>— Action Plan (FEDAF)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmActionDialog
        open={Boolean(targetStatus)}
        onOpenChange={(open) => !open && setTargetStatus(null)}
        title={`Change Report Status to ${targetStatus}?`}
        description={
          targetStatus === "FINALIZED"
            ? "Finalizing locks the calculated scores and opens the supervisory development plan for signature."
            : targetStatus === "PUBLISHED"
              ? "Publishing makes the finalized evaluation report and FEDAF form visible to the faculty member for official acknowledgment."
              : "Reverting to Draft allows recalculation of class scores."
        }
        confirmLabel={`Yes, Set as ${targetStatus}`}
        variant="primary"
        isLoading={isUpdating}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
