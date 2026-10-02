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
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  CONSOLIDATION_FORMULAS,
  DEFAULT_CONSOLIDATION_FORMULA,
  type ISemesterSelect,
} from "@my-app/shared";
import { useBatchConsolidateReports } from "../hooks/useEvaluationSubmissions";

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
      <DialogContent className="sm:max-w-[500px] border-border bg-card text-card-foreground">
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

  const selectedSemester = semesters.find((s) => s.id === targetSemesterId);
  const selectedFormulaDef =
    CONSOLIDATION_FORMULAS[formula] || CONSOLIDATION_FORMULAS[DEFAULT_CONSOLIDATION_FORMULA];

  const handleProceedToConfirmation = () => {
    if (!targetSemesterId) {
      toast.error("Please select an academic semester to consolidate.");
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
        {/* Academic Semester Selector */}
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

        {/* Consolidation Formula Selector */}
        <div className="space-y-1.5">
          <Label className="text-foreground">Consolidation Formula</Label>
          <Select
            value={formula}
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
            <span>Process Summary:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
            <li>Scans all course offerings and enrolled student rosters for this semester</li>
            <li>Calculates class averages and computes weighted SET ratings</li>
            <li>Anonymizes subject names & sections per CHED CMO 19 s. 2025</li>
            <li>
              Extracts supervisor evaluation ratings (SEF) and analyzes qualitative sentiments
            </li>
            <li>Initializes official Annex C records and draft FEDAF development plans</li>
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
          disabled={!targetSemesterId || batchMutation.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
        >
          <span>Continue</span>
        </Button>
      </DialogFooter>

      {/* ── 🛡️ Friction Confirmation Modal ── */}
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
            <span className="block mt-2 font-semibold text-chart-2 text-xs">
              ⚠️ This will calculate and compile evaluation scores for all faculty who taught course
              offerings in this semester.
            </span>
          </span>
        }
        confirmLabel="Yes, Start Consolidation"
        cancelLabel="Back to Options"
        variant="primary"
        isLoading={batchMutation.isPending}
        onConfirm={handleConfirmedConsolidate}
      />
    </>
  );
}
