import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, SendHorizontal, PenTool, Save, Info, Clock } from "lucide-react";
import { useUpdateFedafPlan, useSignFedaf } from "../hooks/useEvaluationSubmissions";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import type { AnnexCFacultyReport, GetUser } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
  currentUser?: GetUser | null | undefined;
  isPrivileged: boolean;
}

export function FedafActionSection({ report, currentUser, isPrivileged }: Props) {
  const updateFedafMutation = useUpdateFedafPlan();
  const signFedafMutation = useSignFedaf();

  const isOwnReport = report.faculty_id === currentUser?.account.id;
  const isSupervisorSigned = Boolean(report.fedaf_plan?.supervisor_signed_at);
  const isFacultySigned = Boolean(report.fedaf_plan?.faculty_signed_at);
  const isPlanPublished = report.status === "PUBLISHED" || isSupervisorSigned;

  // Only a supervisor viewing someone else's report can edit the supervisory plan
  const canEditSupervisorPlan = isPrivileged && !isOwnReport;

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    areas_for_improvement: report.fedaf_plan?.areas_for_improvement || "",
    proposed_activities: report.fedaf_plan?.proposed_activities || "",
    action_plan: report.fedaf_plan?.action_plan || "",
  });

  // Friction Confirmation Dialog States
  const [confirmSupervisorSignOpen, setConfirmSupervisorSignOpen] = useState(false);
  const [confirmFacultySignOpen, setConfirmFacultySignOpen] = useState(false);

  const handleSave = async () => {
    try {
      await updateFedafMutation.mutateAsync({
        reportId: report.id,
        plan: form,
      });
      toast.success("Supervisory development plan saved.");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update development plan.");
    }
  };

  const handleConfirmSign = async (role: "FACULTY" | "SUPERVISOR") => {
    try {
      await signFedafMutation.mutateAsync({
        reportId: report.id,
        signatureRole: role,
      });
      if (role === "SUPERVISOR") {
        toast.success("Signed and officially published to faculty member.");
      } else {
        toast.success("Evaluation acknowledgment recorded.");
      }
      setConfirmSupervisorSignOpen(false);
      setConfirmFacultySignOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to sign acknowledgment.");
    }
  };

  // Determine supervisor designation label
  const supervisorRoleLabel = currentUser?.offices?.chairships?.length
    ? "Program Chair"
    : currentUser?.offices?.deanships?.length
      ? "College Dean"
      : "Supervisor";

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            FEDAF Development Plan & Digital Signatures (Annex D)
          </CardTitle>
          <CardDescription className="text-xs">
            {isOwnReport
              ? "Your official development plan formulated by your supervising academic head."
              : "Joint faculty and supervisor growth plan based on evaluation feedback."}
          </CardDescription>
        </div>

        {!editMode && canEditSupervisorPlan && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setForm({
                areas_for_improvement: report.fedaf_plan?.areas_for_improvement || "",
                proposed_activities: report.fedaf_plan?.proposed_activities || "",
                action_plan: report.fedaf_plan?.action_plan || "",
              });
              setEditMode(true);
            }}
            className="h-8 text-xs gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Edit Plan</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {isOwnReport && (
          <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Personal Teaching Evaluation:</strong> Under CHED CMO 19 s. 2025 Section 9.4,
              your supervisory development plan is formulated by your immediate supervising academic
              head (Program Chair or College Dean).
            </span>
          </div>
        )}

        {/* 🔒 IF FACULTY VIEWS BEFORE SUPERVISOR SIGNS: HIDE DRAFT PLAN */}
        {isOwnReport && !isPlanPublished ? (
          <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-muted/20 space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-foreground">
              Development Plan Under Supervisory Formulation
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your academic supervisor is currently preparing your feedback and development plan
              (Annex D). The action items and learning activities will appear here once your
              supervisor signs and publishes the evaluation.
            </p>
          </div>
        ) : editMode ? (
          /* Supervisor in Edit Mode */
          <div className="p-4 bg-muted/40 border border-primary/40 rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">1. Areas for Improvement:</label>
              <Textarea
                value={form.areas_for_improvement}
                onChange={(e) => setForm((p) => ({ ...p, areas_for_improvement: e.target.value }))}
                placeholder="Identify instructional, pedagogical, or classroom targets..."
                className="text-xs min-h-[60px] bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                2. Proposed Learning & Development Activities:
              </label>
              <Textarea
                value={form.proposed_activities}
                onChange={(e) => setForm((p) => ({ ...p, proposed_activities: e.target.value }))}
                placeholder="Workshops, peer mentoring, syllabus alignment..."
                className="text-xs min-h-[60px] bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                3. Action Plan & Milestones:
              </label>
              <Textarea
                value={form.action_plan}
                onChange={(e) => setForm((p) => ({ ...p, action_plan: e.target.value }))}
                placeholder="Target timelines, outcomes, and progress review..."
                className="text-xs min-h-[60px] bg-card"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateFedafMutation.isPending}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Plan</span>
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-xs">
              <p className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                1. Areas for Improvement
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.fedaf_plan?.areas_for_improvement || "No areas documented yet."}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-xs">
              <p className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                2. Proposed Activities
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.fedaf_plan?.proposed_activities || "No activities proposed yet."}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-xs">
              <p className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                3. Action Plan
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {report.fedaf_plan?.action_plan || "No action plan outlined yet."}
              </p>
            </div>
          </div>
        )}

        {/* ── E-Signature Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* ── 1. SUPERVISOR CARD (Left) ── */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-foreground">Supervisor Acknowledgment</span>
              <p className="text-muted-foreground">
                {report.fedaf_plan?.supervisor_name || "Unsigned"}
              </p>
              {report.fedaf_plan?.supervisor_signed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Signed: {new Date(report.fedaf_plan.supervisor_signed_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {isSupervisorSigned ? (
              <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Signed & Published
              </Badge>
            ) : canEditSupervisorPlan ? (
              <Button
                size="sm"
                onClick={() => setConfirmSupervisorSignOpen(true)}
                disabled={signFedafMutation.isPending}
                className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 text-white shadow-2xs"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>Sign as {supervisorRoleLabel} & Publish</span>
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                Pending Supervisor Signature
              </Badge>
            )}
          </div>

          {/* ── 2. FACULTY CARD (Right) ── */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-foreground">Faculty Member Acknowledgment</span>
              <p className="text-muted-foreground">{report.faculty_name}</p>
              {report.fedaf_plan?.faculty_signed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Acknowledged: {new Date(report.fedaf_plan.faculty_signed_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {isFacultySigned ? (
              <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Acknowledged
              </Badge>
            ) : isOwnReport ? (
              isSupervisorSigned ? (
                <Button
                  size="sm"
                  onClick={() => setConfirmFacultySignOpen(true)}
                  disabled={signFedafMutation.isPending}
                  className="h-8 text-xs gap-1.5 bg-success text-white hover:bg-success/90 shadow-2xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Sign Acknowledgment</span>
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1">
                  <Clock className="w-3 h-3 opacity-60" /> Awaiting Supervisor Signature
                </Badge>
              )
            ) : (
              /* When viewing as Supervisor/Admin, show status badge — NEVER a signature button */
              <Badge
                variant="outline"
                className="text-warning border-warning/30 text-[10px] gap-1"
              >
                <Clock className="w-3 h-3 opacity-60" /> Awaiting Faculty Acknowledgment
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      {/* ── Friction Modal: Supervisor Signing & Auto-Publishing ── */}
      <ConfirmActionDialog
        open={confirmSupervisorSignOpen}
        onOpenChange={setConfirmSupervisorSignOpen}
        title={`Sign & Publish Evaluation for ${report.faculty_name}?`}
        description={
          <span>
            Signing certifies that you have formulated and discussed this development plan with{" "}
            <strong>{report.faculty_name}</strong>.
            <span className="block mt-2 font-semibold text-success text-xs">
              ✓ This action will officially publish the report and notify the faculty member to
              review and sign their acknowledgment.
            </span>
          </span>
        }
        confirmLabel="Confirm, Sign & Publish"
        variant="primary"
        isLoading={signFedafMutation.isPending}
        onConfirm={() => handleConfirmSign("SUPERVISOR")}
      />

      {/* ── Friction Modal: Faculty Acknowledgment Signing ── */}
      <ConfirmActionDialog
        open={confirmFacultySignOpen}
        onOpenChange={setConfirmFacultySignOpen}
        title="Sign Faculty Evaluation Acknowledgment (Annex D)?"
        description={
          <span>
            I acknowledge that I have received and reviewed the faculty evaluation conducted for the{" "}
            <strong>
              {report.semester_term} ({report.school_year})
            </strong>
            . My signature confirms that I have been given the opportunity to discuss it with my
            supervisor.
          </span>
        }
        confirmLabel="Confirm & Sign Acknowledgment"
        variant="primary"
        isLoading={signFedafMutation.isPending}
        onConfirm={() => handleConfirmSign("FACULTY")}
      />
    </Card>
  );
}
