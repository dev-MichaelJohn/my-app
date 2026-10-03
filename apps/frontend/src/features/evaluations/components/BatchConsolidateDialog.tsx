import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Sparkles, Layers, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  CONSOLIDATION_FORMULAS,
  DEFAULT_CONSOLIDATION_FORMULA,
  type ISemesterSelect,
} from "@my-app/shared";
import { useBatchConsolidateReports } from "../hooks/useEvaluationSubmissions";
import {
  useActiveStudentSchedule,
  useActiveSupervisorSchedule,
} from "@/features/evaluation-schedules/hooks/useEvaluationSchedules";

interface BatchConsolidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesters: ISemesterSelect[];
  defaultSemesterId?: number;
  onSuccess?: () => void;
}

export function BatchConsolidateDialog({
  open,
  onOpenChange,
  semesters,
  defaultSemesterId,
  onSuccess,
}: BatchConsolidateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card text-card-foreground">
        {open && (
          <BatchConsolidateDialogInner
            semesters={semesters}
            defaultSemesterId={defaultSemesterId}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BatchConsolidateDialogInner({
  semesters,
  defaultSemesterId,
  onClose,
  onSuccess,
}: {
  semesters: ISemesterSelect[];
  defaultSemesterId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const batchMutation = useBatchConsolidateReports();

  const [targetSemesterId, setTargetSemesterId] = useState<number | undefined>(
    () => defaultSemesterId || semesters[0]?.id,
  );
  const [formula, setFormula] = useState<string>(DEFAULT_CONSOLIDATION_FORMULA);
  const [confirmFrictionOpen, setConfirmFrictionOpen] = useState(false);

  // Check if evaluation schedules are still actively open for this semester
  const { data: activeStudentSchedule, isLoading: isCheckingSet } =
    useActiveStudentSchedule(targetSemesterId);
  const { data: activeSupervisorSchedule, isLoading: isCheckingSef } =
    useActiveSupervisorSchedule(targetSemesterId);

  const isScheduleActive = Boolean(activeStudentSchedule || activeSupervisorSchedule);

  const selectedSemester = semesters.find((s) => s.id === targetSemesterId);
  const selectedFormulaDef =
    CONSOLIDATION_FORMULAS[formula] || CONSOLIDATION_FORMULAS[DEFAULT_CONSOLIDATION_FORMULA];

  const handleProceedToConfirmation = () => {
    if (!targetSemesterId) {
      toast.error("Please select an academic semester to consolidate.");
      return;
    }
    if (isScheduleActive) {
      toast.error("Cannot consolidate reports while evaluation windows are still open.");
      return;
    }
    setConfirmFrictionOpen(true);
  };

  const handleConfirmedConsolidate = async () => {
    if (!targetSemesterId) return;

    try {
      const summary = await batchMutation.mutateAsync({
        semester_id: targetSemesterId,
        formula,
      });

      toast.success(summary.message);
      setConfirmFrictionOpen(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to consolidate reports.");
      setConfirmFrictionOpen(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" />
          <span>Consolidate Faculty Reports</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Compile and calculate Annex C (SET) and SEF performance reports across all teaching
          faculty in the selected semester.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Semester Selector */}
        <div className="space-y-1.5">
          <Label className="text-foreground">Target Academic Semester</Label>
          <Select
            value={targetSemesterId ? String(targetSemesterId) : ""}
            onValueChange={(val) => setTargetSemesterId(val ? Number(val) : undefined)}
          >
            <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm">
              <SelectValue placeholder="Select semester...">
                {selectedSemester ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {selectedSemester.semester_term} Sem
                    </strong>
                    (A.Y. {selectedSemester.school_year_start}-{selectedSemester.school_year_end})
                  </span>
                ) : (
                  "Select semester..."
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-sm max-h-56">
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── 🛡️ Active Schedule Blocker Banner ── */}
        {isScheduleActive ? (
          <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-warning">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Evaluation Periods Currently In Progress</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Consolidation is locked because evaluations are still actively being submitted for
              this semester:
            </p>
            <div className="space-y-1 pl-1">
              {activeStudentSchedule && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                    SET Window Active
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Closes on {new Date(activeStudentSchedule.close_at).toLocaleString()}
                  </span>
                </div>
              )}
              {activeSupervisorSchedule && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                    SEF Window Active
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Closes on {new Date(activeSupervisorSchedule.close_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground italic pt-1">
              Wait for the schedule deadline to pass or use <strong>Force Stop</strong> in
              Evaluation Schedules before generating official reports.
            </p>
          </div>
        ) : (
          <div className="p-2.5 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Evaluation schedules for this term are concluded. Ready for consolidation.</span>
          </div>
        )}

        {/* Consolidation Formula Selector */}
        <div className="space-y-1.5">
          <Label className="text-foreground">Consolidation Formula</Label>
          <Select
            value={formula}
            disabled={isScheduleActive}
            onValueChange={(val) => {
              if (val) setFormula(val);
            }}
          >
            <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm">
              <SelectValue placeholder="Select formula..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-sm">
              {Object.values(CONSOLIDATION_FORMULAS).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <div className="flex flex-col py-0.5 text-left">
                    <span className="font-semibold text-foreground">{f.name}</span>
                    <span className="text-[11px] text-primary font-mono">{f.formulaDisplay}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Process Information Guide */}
        <div className="p-3.5 bg-muted/50 border border-border/80 rounded-xl text-xs space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Compliance Notice (CHED CMO 19 s. 2025):</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
            <li>
              Reports require complete student and supervisory submissions to ensure valid metrics.
            </li>
            <li>Subject names and sections will be anonymized to protect student privacy.</li>
            <li>
              Annex C and Annex D (FEDAF) development plans will be generated in <code>DRAFT</code>{" "}
              status for supervisory review.
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter className="pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={batchMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleProceedToConfirmation}
          disabled={
            !targetSemesterId ||
            isScheduleActive ||
            isCheckingSet ||
            isCheckingSef ||
            batchMutation.isPending
          }
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 disabled:opacity-50"
        >
          {isScheduleActive ? "Schedules In Progress" : "Continue"}
        </Button>
      </DialogFooter>

      {/* Confirmation Modal */}
      <ConfirmActionDialog
        open={confirmFrictionOpen}
        onOpenChange={setConfirmFrictionOpen}
        title={`Run Consolidation for ${selectedSemester?.semester_term} Semester?`}
        description={
          <span>
            Are you sure you want to run batch consolidation for{" "}
            <strong>
              {selectedSemester?.semester_term} Semester (A.Y. {selectedSemester?.school_year_start}
              -{selectedSemester?.school_year_end})
            </strong>{" "}
            using the <strong>{selectedFormulaDef?.name}</strong> formula?
          </span>
        }
        confirmLabel="Yes, Start Consolidation"
        cancelLabel="Back"
        variant="primary"
        isLoading={batchMutation.isPending}
        onConfirm={handleConfirmedConsolidate}
      />
    </>
  );
}
