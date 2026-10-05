import { useState } from "react";
import {
  useSupervisorFaculty,
  useSupervisorFormView,
  useSubmitSupervisorEvaluation,
} from "../hooks/useEvaluationSubmissions";
import { EvaluationRatingScale, RatingScaleGuide } from "../components/EvaluationRatingScale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  UserCheck,
  ArrowLeft,
  MessageSquare,
  FileText,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { EvaluableSupervisorFaculty } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function SupervisorEvaluationPage() {
  const { data: facultyList, isLoading } = useSupervisorFaculty();
  const [selectedFaculty, setSelectedFaculty] = useState<EvaluableSupervisorFaculty | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 border border-border rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedFaculty) {
    return (
      <SupervisorEvaluationFormViewComponent
        facultyId={selectedFaculty.faculty.account.id}
        onBack={() => setSelectedFaculty(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Supervisor Evaluation of Faculty (SEF)
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conduct comprehensive semester performance appraisals for faculty under your supervision
          (Annex B).
        </p>
      </div>

      {!facultyList || facultyList.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
          <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground text-lg">
            No Faculty Members Found for Supervision
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            Either the supervisor evaluation period is currently closed, or you have no subordinate
            faculty members assigned to your department for this term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facultyList.map((item) => {
            const facultyName = `${item.faculty.details.first_name} ${item.faculty.details.last_name}${
              item.faculty.details.suffix ? ` ${item.faculty.details.suffix}` : ""
            }`;

            return (
              <Card
                key={item.faculty.account.id}
                className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {item.faculty.details.first_name[0]}
                      {item.faculty.details.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{facultyName}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.faculty.details.institutional_id}
                      </p>
                    </div>
                  </div>

                  {item.has_submitted ? (
                    <Badge className="bg-success/15 text-success border-success/20 font-semibold gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Evaluated
                    </Badge>
                  ) : item.is_draft ? (
                    <Badge className="bg-warning/15 text-warning border-warning/20 font-semibold text-[11px]">
                      Draft Saved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[11px]">
                      Pending Review
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  {/* Teaching Load Context Chips */}
                  <div className="p-2.5 bg-muted/40 border border-border/60 rounded-xl space-y-1.5 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-primary" />
                      <span>Term Teaching Load ({item.teaching_classes.length} classes):</span>
                    </p>
                    {item.teaching_classes.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        No assigned classes this term.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {item.teaching_classes.map((cls) => (
                          <Badge
                            key={cls.offering_id}
                            variant="secondary"
                            className="text-[10px] font-mono px-1.5 py-0"
                          >
                            {cls.course_code} ({cls.year_level}-{cls.section})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {item.has_submitted
                      ? `Evaluated on ${new Date(item.submitted_at!).toLocaleDateString()}`
                      : "Semester Appraisal"}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedFaculty(item)}
                    className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <span>
                      {item.has_submitted
                        ? "View Appraisal"
                        : item.is_draft
                          ? "Continue Draft"
                          : "Evaluate Faculty"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 1. Container: Handles loading & mounts content with a unique key ──
function SupervisorEvaluationFormViewComponent({
  facultyId,
  onBack,
}: {
  facultyId: number;
  onBack: () => void;
}) {
  const { data: viewData, isLoading } = useSupervisorFormView(facultyId);

  if (isLoading || !viewData) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <SupervisorEvaluationFormContent
      key={facultyId}
      facultyId={facultyId}
      viewData={viewData}
      onBack={onBack}
    />
  );
}

// ── 2. Content Form: Directly initializes ratings and comments without linter warnings ──
function SupervisorEvaluationFormContent({
  facultyId,
  viewData,
  onBack,
}: {
  facultyId: number;
  viewData: NonNullable<ReturnType<typeof useSupervisorFormView>["data"]>;
  onBack: () => void;
}) {
  const submitMutation = useSubmitSupervisorEvaluation();

  // ✅ Initialized directly on mount — zero useEffect, zero cascading renders
  const [ratings, setRatings] = useState<Record<number, number>>(
    () => viewData.saved_ratings ?? {},
  );
  const [comment, setComment] = useState<string>(() => viewData.saved_comment ?? "");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const { form, faculty, teaching_classes, is_submitted } = viewData;
  const facultyName = `${faculty.details.first_name} ${faculty.details.last_name}${
    faculty.details.suffix ? ` ${faculty.details.suffix}` : ""
  }`;

  const allQuestions = form.categories.flatMap((c) => c.questions);
  const totalRated = allQuestions.filter((q) => ratings[q.id] !== undefined).length;
  const isComplete = totalRated === allQuestions.length;

  const handleRatingSelect = (questionId: number, ratingVal: number) => {
    if (is_submitted) return;
    setRatings((prev) => ({ ...prev, [questionId]: ratingVal }));
  };

  const handleSave = async (isDraft: boolean) => {
    const ratingItems = Object.entries(ratings).map(([qId, val]) => ({
      question_id: Number(qId),
      rating: val,
    }));

    if (!isDraft && ratingItems.length < allQuestions.length) {
      toast.error("Please provide a rating for all supervisory criteria before submitting.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        schedule_id: viewData.schedule_id,
        faculty_id: facultyId,
        ratings: ratingItems,
        comment: comment.trim() || undefined,
        is_draft: isDraft,
      });

      if (isDraft) {
        toast.success("Supervisor evaluation draft saved.");
      } else {
        toast.success("Supervisor evaluation submitted successfully.");
        setConfirmSubmitOpen(false);
        onBack();
      }
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to submit supervisor evaluation.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Faculty List</span>
      </Button>

      {/* ── Form Header ── */}
      <div className="p-6 border border-border rounded-2xl bg-card shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono font-bold text-success border-success/20">
            Annex B Instrument
          </Badge>
          {is_submitted && (
            <Badge className="bg-success/15 text-success border-success/20 font-semibold gap-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{form.title}</h1>
        <p className="text-sm text-muted-foreground">
          Evaluating Faculty: <strong className="text-foreground">{facultyName}</strong> (
          {faculty.details.institutional_id})
        </p>
        {form.description && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            {form.description}
          </p>
        )}

        {/* ── Instructional Reference Audit Banner ── */}
        <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-1.5 text-xs">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>Assigned Teaching Load This Semester (Reference for MOVs):</span>
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {teaching_classes.map((cls) => (
              <span
                key={cls.offering_id}
                className="px-2 py-0.5 rounded-md bg-background border border-border/80 font-mono text-[11px] text-foreground"
              >
                <strong>{cls.course_code}</strong>: {cls.course_name} ({cls.program_code}{" "}
                {cls.year_level}-{cls.section})
              </span>
            ))}
          </div>
        </div>

        {/* Progress */}
        {!is_submitted && (
          <div className="pt-2">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">Appraisal Progress</span>
              <span className="text-primary font-mono">
                {totalRated} / {allQuestions.length} Criteria Rated
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(totalRated / allQuestions.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Dynamic Rating Scale Guide ── */}
      <RatingScaleGuide minRating={form.min_rating} maxRating={form.max_rating} />

      {/* ── Criteria with MOVs ── */}
      <div className="space-y-6">
        {form.categories.map((cat, cIdx) => (
          <div
            key={cat.id}
            className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden"
          >
            <div className="p-4 bg-muted/40 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                {cIdx + 1}. {cat.name}
              </h3>
              {cat.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              )}
            </div>

            <div className="p-4 divide-y divide-border/60">
              {cat.questions.map((q, qIdx) => (
                <div key={q.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {qIdx + 1}. {q.question}
                  </p>

                  {/* MOVs List */}
                  {q.means && q.means.length > 0 && (
                    <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1 text-xs">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-primary" /> Means of Verification
                        (MOVs):
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-foreground">
                        {q.means.map((m) => (
                          <li key={m.id}>{m.descriptor}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <EvaluationRatingScale
                    minRating={form.min_rating}
                    maxRating={q.max_rating || form.max_rating}
                    selectedRating={ratings[q.id]}
                    disabled={is_submitted}
                    showLabels={true}
                    onSelect={(score) => handleRatingSelect(q.id, score)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── Supervisory Remarks Section ── */}
        <div className="p-5 border border-border rounded-2xl bg-card shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Supervisory Remarks & Recommendations (Optional)</span>
          </div>
          <Textarea
            value={comment}
            disabled={is_submitted}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Document overall semester performance, grade sheet timeliness, syllabus compliance, and development recommendations..."
            className="min-h-[100px] text-sm bg-background border-input"
            maxLength={1000}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              Remarks are analyzed for sentiment and directly feed into the faculty member's
              development plan (Annex D).
            </span>
            <span>{comment.length}/1000</span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      {!is_submitted && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            disabled={submitMutation.isPending}
            onClick={() => handleSave(true)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={!isComplete || submitMutation.isPending}
            onClick={() => setConfirmSubmitOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitMutation.isPending ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              "Submit Semester Appraisal"
            )}
          </Button>
        </div>
      )}

      <ConfirmActionDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Submit Supervisor Evaluation?"
        description={
          <span>
            Are you sure you want to finalize the semester evaluation for{" "}
            <strong>{facultyName}</strong>? Once submitted, the ratings and remarks are sealed for
            the official Annex C and FEDAF reports.
          </span>
        }
        confirmLabel="Yes, Submit Appraisal"
        variant="primary"
        isLoading={submitMutation.isPending}
        onConfirm={() => handleSave(false)}
      />
    </div>
  );
}
