import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, FileBadge2, PenTool, Save } from "lucide-react";
import { useUpdateFedafPlan, useSignFedaf } from "../hooks/useEvaluationSubmissions";
import { toast } from "sonner";
import type { AnnexCFacultyReport, GetUser } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
  currentUser?: GetUser | null;
  isPrivileged: boolean;
}

export function AnnexDDocument({ report, currentUser, isPrivileged }: Props) {
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
    <Card className="border border-border bg-card text-card-foreground shadow-sm p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
      <div className="flex justify-between items-start border-b border-border pb-4 print:border-black">
        <Badge variant="outline" className="font-mono text-[11px] uppercase">
          Annex D — FEDAF Form
        </Badge>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">
            FACULTY EVALUATION & DEVELOPMENT ACKNOWLEDGMENT
          </p>
          <p className="text-[10px] text-muted-foreground print:text-gray-600">
            Jointly accomplished by Supervisor and Faculty
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground uppercase print:text-black">
          FACULTY EVALUATION AND DEVELOPMENT ACKNOWLEDGMENT FORM (FEDAF)
        </h2>
        <p className="text-xs text-muted-foreground print:text-gray-600">
          Palompon Institute of Technology — Academic Quality Management
        </p>
      </div>

      {/* SECTION A: Faculty Member Information */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
          A. Faculty Member Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-xs bg-muted/30 p-4 rounded-xl border border-border/70 print:border-black print:bg-transparent">
          <div className="flex justify-between sm:justify-start gap-4">
            <span className="text-muted-foreground font-medium w-48 print:text-black">
              Name of Faculty
            </span>
            <span className="font-bold text-foreground print:text-black">
              : {report.faculty_name}
            </span>
          </div>
          <div className="flex justify-between sm:justify-start gap-4">
            <span className="text-muted-foreground font-medium w-48 print:text-black">
              Department / College
            </span>
            <span className="font-bold text-foreground print:text-black">
              : {report.department_college}
            </span>
          </div>
          <div className="flex justify-between sm:justify-start gap-4">
            <span className="text-muted-foreground font-medium w-48 print:text-black">
              Current Faculty Rank
            </span>
            <span className="font-semibold text-foreground print:text-black">
              : {report.faculty_rank}
            </span>
          </div>
          <div className="flex justify-between sm:justify-start gap-4">
            <span className="text-muted-foreground font-medium w-48 print:text-black">
              Semester / Term & Year
            </span>
            <span className="font-semibold text-foreground print:text-black">
              : {report.semester_term} / {report.school_year}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION B: Faculty Evaluation Summary */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
          B. Faculty Evaluation Summary
        </h3>
        <div className="border border-border rounded-xl overflow-hidden print:border-black">
          <Table>
            <TableHeader className="bg-muted/60 print:bg-gray-100">
              <TableRow className="border-border text-xs print:border-black">
                <TableHead className="text-center font-bold text-foreground print:text-black">
                  Student Evaluation of Teachers (SET) Overall
                </TableHead>
                <TableHead className="text-center font-bold text-foreground print:text-black">
                  Supervisor's Evaluation of Faculty (SEF) Overall
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border text-base font-mono font-bold print:border-black">
                <TableCell className="text-center text-primary print:text-black">
                  {report.overall_set_rating.toFixed(2)}
                </TableCell>
                <TableCell className="text-center text-emerald-600 dark:text-emerald-400 print:text-black">
                  {report.overall_sef_rating !== null
                    ? report.overall_sef_rating.toFixed(2)
                    : "N/A"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SECTION C: Development Plan */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
            C. Development Plan (to be jointly accomplished by the Supervisor and Faculty)
          </h3>
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
              className="text-xs h-8 gap-1.5 print:hidden"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Edit Development Plan</span>
            </Button>
          )}
        </div>

        {editMode ? (
          <div className="p-4 bg-muted/30 border border-primary/40 rounded-xl space-y-4 print:hidden">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Areas for Improvement:</label>
              <Textarea
                value={form.areas_for_improvement}
                onChange={(e) => setForm((p) => ({ ...p, areas_for_improvement: e.target.value }))}
                placeholder="Identify specific instructional, classroom, or curriculum areas..."
                className="text-xs min-h-[70px] bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Proposed Learning and Development Activities:
              </label>
              <Textarea
                value={form.proposed_activities}
                onChange={(e) => setForm((p) => ({ ...p, proposed_activities: e.target.value }))}
                placeholder="Seminars, workshops, OBE training, mentoring..."
                className="text-xs min-h-[70px] bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Action Plan & Milestones:</label>
              <Textarea
                value={form.action_plan}
                onChange={(e) => setForm((p) => ({ ...p, action_plan: e.target.value }))}
                placeholder="Target timelines, metrics, and progress review..."
                className="text-xs min-h-[70px] bg-background"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
          <div className="border border-border rounded-xl divide-y divide-border text-xs print:border-black print:divide-black">
            <div className="p-4 space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider print:text-black">
                1. Areas for Improvement:
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed print:text-black">
                {report.fedaf_plan?.areas_for_improvement || "No areas identified yet."}
              </p>
            </div>
            <div className="p-4 space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider print:text-black">
                2. Proposed Learning and Development Activities:
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed print:text-black">
                {report.fedaf_plan?.proposed_activities || "No activities proposed yet."}
              </p>
            </div>
            <div className="p-4 space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider print:text-black">
                3. Action Plan:
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed print:text-black">
                {report.fedaf_plan?.action_plan || "No action plan outlined yet."}
              </p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground italic print:text-gray-700">
          "I acknowledge that I have received and reviewed the faculty evaluation conducted for the
          period mentioned above. I understand that my signature below confirms that I have been
          given the opportunity to discuss it with my supervisor."
        </p>

        {/* E-Signature Acknowledgment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Supervisor Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 print:border-black print:bg-transparent">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wide text-foreground print:text-black">
                Supervisor
              </span>
              {report.fedaf_plan?.supervisor_signed_at ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                  <CheckCircle className="w-3 h-3" /> Signed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                  Pending Signature
                </Badge>
              )}
            </div>

            <div className="text-xs space-y-1">
              <p className="text-muted-foreground print:text-black">
                Name:{" "}
                <strong className="text-foreground print:text-black">
                  {report.fedaf_plan?.supervisor_name || "—"}
                </strong>
              </p>
              <p className="text-muted-foreground print:text-black">
                Date Signed:{" "}
                <strong className="text-foreground print:text-black">
                  {report.fedaf_plan?.supervisor_signed_at
                    ? new Date(report.fedaf_plan.supervisor_signed_at).toLocaleString()
                    : "—"}
                </strong>
              </p>
            </div>

            {isPrivileged && !report.fedaf_plan?.supervisor_signed_at && (
              <Button
                size="sm"
                onClick={() => handleSign("SUPERVISOR")}
                disabled={signFedafMutation.isPending}
                className="w-full text-xs h-8 gap-1.5 print:hidden"
              >
                <FileBadge2 className="w-3.5 h-3.5" />
                <span>Sign as Supervisor</span>
              </Button>
            )}
          </div>

          {/* Faculty Card */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 print:border-black print:bg-transparent">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wide text-foreground print:text-black">
                Faculty Member
              </span>
              {report.fedaf_plan?.faculty_signed_at ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                  <CheckCircle className="w-3 h-3" /> Acknowledged
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                  Pending Acknowledgment
                </Badge>
              )}
            </div>

            <div className="text-xs space-y-1">
              <p className="text-muted-foreground print:text-black">
                Name:{" "}
                <strong className="text-foreground print:text-black">{report.faculty_name}</strong>
              </p>
              <p className="text-muted-foreground print:text-black">
                Date Acknowledged:{" "}
                <strong className="text-foreground print:text-black">
                  {report.fedaf_plan?.faculty_signed_at
                    ? new Date(report.fedaf_plan.faculty_signed_at).toLocaleString()
                    : "—"}
                </strong>
              </p>
            </div>

            {isFacultyOwner &&
              report.status === "PUBLISHED" &&
              !report.fedaf_plan?.faculty_signed_at && (
                <Button
                  size="sm"
                  onClick={() => handleSign("FACULTY")}
                  disabled={signFedafMutation.isPending}
                  className="w-full text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white print:hidden"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Sign & Acknowledge Evaluation</span>
                </Button>
              )}
          </div>
        </div>
      </div>
    </Card>
  );
}
