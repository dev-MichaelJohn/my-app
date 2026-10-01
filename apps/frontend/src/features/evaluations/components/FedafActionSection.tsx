import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, FileBadge2, PenTool, Save } from "lucide-react";
import { useUpdateFedafPlan, useSignFedaf } from "../hooks/useEvaluationSubmissions";
import { toast } from "sonner";
import type { AnnexCFacultyReport, GetUser } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
  currentUser?: GetUser | null;
  isPrivileged: boolean;
}

export function FedafActionSection({ report, currentUser, isPrivileged }: Props) {
  const updateFedafMutation = useUpdateFedafPlan();
  const signFedafMutation = useSignFedaf();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    areas_for_improvement: report.fedaf_plan?.areas_for_improvement || "",
    proposed_activities: report.fedaf_plan?.proposed_activities || "",
    action_plan: report.fedaf_plan?.action_plan || "",
  });

  const isFacultyOwner = report.faculty_id === currentUser?.account.id;

  const handleSave = async () => {
    try {
      await updateFedafMutation.mutateAsync({
        reportId: report.id,
        plan: form,
      });
      toast.success("Development plan saved successfully.");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update development plan.");
    }
  };

  const handleSign = async (role: "FACULTY" | "SUPERVISOR") => {
    try {
      await signFedafMutation.mutateAsync({
        reportId: report.id,
        signatureRole: role,
      });
      toast.success(`Acknowledgment signature recorded as ${role.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to sign acknowledgment.");
    }
  };

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            FEDAF Development Plan & Digital Signatures (Annex D)
          </CardTitle>
          <CardDescription className="text-xs">
            Joint faculty and supervisor growth plan based on evaluation feedback.
          </CardDescription>
        </div>

        {!editMode && (isPrivileged || isFacultyOwner) && (
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
        {editMode ? (
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

        {/* E-Signature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Supervisor Card */}
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

            {report.fedaf_plan?.supervisor_signed_at ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Signed
              </Badge>
            ) : isPrivileged ? (
              <Button
                size="sm"
                onClick={() => handleSign("SUPERVISOR")}
                disabled={signFedafMutation.isPending}
                className="h-7 text-xs gap-1"
              >
                <FileBadge2 className="w-3 h-3" />
                <span>Sign</span>
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                Pending
              </Badge>
            )}
          </div>

          {/* Faculty Card */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-foreground">Faculty Acknowledgment</span>
              <p className="text-muted-foreground">{report.faculty_name}</p>
              {report.fedaf_plan?.faculty_signed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Signed: {new Date(report.fedaf_plan.faculty_signed_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {report.fedaf_plan?.faculty_signed_at ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                <CheckCircle className="w-3 h-3" /> Signed
              </Badge>
            ) : isFacultyOwner && report.status === "PUBLISHED" ? (
              <Button
                size="sm"
                onClick={() => handleSign("FACULTY")}
                disabled={signFedafMutation.isPending}
                className="h-7 text-xs gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Sign</span>
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                {report.status !== "PUBLISHED" ? "Awaiting Publish" : "Pending"}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
