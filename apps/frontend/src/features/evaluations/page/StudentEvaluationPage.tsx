import { useState, useRef, useCallback, useEffect } from "react";
import {
  useStudentSubjects,
  useStudentFormView,
  useSubmitStudentEvaluation,
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
  FileCheck2,
  ArrowLeft,
  MessageSquare,
  Check,
} from "lucide-react";
import type { EvaluableStudentSubject } from "@my-app/shared";

export default function StudentEvaluationPage() {
  const { data: subjects, isLoading } = useStudentSubjects();
  const [selectedSubject, setSelectedSubject] = useState<EvaluableStudentSubject | null>(null);

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

  if (selectedSubject) {
    return (
      <StudentEvaluationFormViewComponent
        studentClassId={selectedSubject.student_class_id}
        onBack={() => setSelectedSubject(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Evaluate Instructors (SET)
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit official faculty teaching evaluations for your enrolled subjects this term.
        </p>
      </div>

      {!subjects || subjects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
          <FileCheck2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground text-lg">No Active Evaluations Available</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            There is currently no open evaluation schedule, or you have no enrolled subjects
            assigned for evaluation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub) => {
            const facultyName = sub.offering.faculty
              ? `${sub.offering.faculty.details.first_name} ${sub.offering.faculty.details.last_name}`
              : "Unassigned Instructor";

            return (
              <Card
                key={sub.student_class_id}
                className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono font-bold text-primary border-primary/20"
                    >
                      {sub.offering.course_curriculum.course.initialism}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {sub.offering.class.program.initialism} {sub.offering.class.year_level}-
                      {sub.offering.class.section}
                    </Badge>
                  </div>

                  {sub.has_submitted ? (
                    <Badge className="bg-success/15 text-success border-success/20 font-semibold gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </Badge>
                  ) : sub.is_draft ? (
                    <Badge className="bg-warning/15 text-warning border-warning/20 font-semibold text-[11px]">
                      Draft Saved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[11px]">
                      Pending
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-snug line-clamp-1">
                      {sub.offering.course_curriculum.course.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instructor: <strong className="text-foreground">{facultyName}</strong>
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {sub.has_submitted
                      ? `Submitted on ${new Date(sub.submitted_at!).toLocaleDateString()}`
                      : "Action Required"}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedSubject(sub)}
                    className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <span>
                      {sub.has_submitted
                        ? "View Response"
                        : sub.is_draft
                          ? "Continue Draft"
                          : "Start Evaluation"}
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

function StudentEvaluationFormViewComponent({
  studentClassId,
  onBack,
}: {
  studentClassId: number;
  onBack: () => void;
}) {
  const { data: viewData, isLoading } = useStudentFormView(studentClassId);

  if (isLoading || !viewData) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <StudentEvaluationFormContent
      studentClassId={studentClassId}
      viewData={viewData}
      onBack={onBack}
    />
  );
}

function StudentEvaluationFormContent({
  studentClassId,
  viewData,
  onBack,
}: {
  studentClassId: number;
  viewData: NonNullable<ReturnType<typeof useStudentFormView>["data"]>;
  onBack: () => void;
}) {
  const submitMutation = useSubmitStudentEvaluation();

  const [ratings, setRatings] = useState<Record<number, number>>(
    () => viewData.saved_ratings ?? {},
  );
  const [comment, setComment] = useState<string>(() => viewData.saved_comment ?? "");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    viewData.saved_ratings && Object.keys(viewData.saved_ratings).length > 0 ? "saved" : "idle",
  );

  const { form, offering, is_submitted } = viewData;
  const facultyName = offering.faculty
    ? `${offering.faculty.details.first_name} ${offering.faculty.details.last_name}`
    : "Instructor";

  const allQuestions = form.categories.flatMap((c) => c.questions);
  const totalRated = allQuestions.filter((q) => ratings[q.id] !== undefined).length;
  const isComplete = totalRated === allQuestions.length;
  const progressPercent =
    allQuestions.length > 0 ? Math.round((totalRated / allQuestions.length) * 100) : 0;

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoSave = useCallback(
    async (targetRatings: Record<number, number>, targetComment: string) => {
      if (is_submitted) return;

      const ratingItems = Object.entries(targetRatings).map(([qId, val]) => ({
        question_id: Number(qId),
        rating: val,
      }));

      if (ratingItems.length === 0 && !targetComment.trim()) return;

      setSaveStatus("saving");
      try {
        await submitMutation.mutateAsync({
          schedule_id: viewData.schedule_id,
          student_class_id: studentClassId,
          ratings: ratingItems,
          comment: targetComment.trim() || undefined,
          is_draft: true,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [is_submitted, viewData.schedule_id, studentClassId, submitMutation],
  );

  const scheduleAutoSave = useCallback(
    (nextRatings: Record<number, number>, nextComment: string, debounceMs = 350) => {
      if (is_submitted) return;

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      setSaveStatus("saving");
      autosaveTimerRef.current = setTimeout(() => {
        performAutoSave(nextRatings, nextComment);
      }, debounceMs);
    },
    [is_submitted, performAutoSave],
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const handleRatingSelect = (questionId: number, ratingVal: number) => {
    if (is_submitted) return;
    const nextRatings = { ...ratings, [questionId]: ratingVal };
    setRatings(nextRatings);
    scheduleAutoSave(nextRatings, comment, 300);
  };

  const handleCommentChange = (text: string) => {
    if (is_submitted) return;
    setComment(text);
    scheduleAutoSave(ratings, text, 800);
  };

  const handleFinalSubmit = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    const ratingItems = Object.entries(ratings).map(([qId, val]) => ({
      question_id: Number(qId),
      rating: val,
    }));

    if (ratingItems.length < allQuestions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        schedule_id: viewData.schedule_id,
        student_class_id: studentClassId,
        ratings: ratingItems,
        comment: comment.trim() || undefined,
        is_draft: false,
      });

      toast.success("Evaluation submitted successfully. Thank you for your feedback!");
      setConfirmSubmitOpen(false);
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evaluation.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {!is_submitted && (
        <div className="sticky top-16 z-20 -mx-2 px-3 py-2 sm:mx-0 sm:px-4 bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xs transition-all">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground truncate max-w-[170px] sm:max-w-sm">
              Evaluating: {offering.course_curriculum.course.initialism} • {facultyName}
            </span>

            <div className="flex items-center gap-3 shrink-0">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
                  <Spinner size="xs" />
                  <span className="hidden sm:inline">Saving draft...</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-[11px] text-success font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Draft saved</span>
                </span>
              )}
              {saveStatus === "error" && (
                <button
                  type="button"
                  onClick={() => performAutoSave(ratings, comment)}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Save failed. Retry?
                </button>
              )}

              <span className="font-mono font-bold text-primary">
                {totalRated} / {allQuestions.length} ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subjects</span>
      </Button>

      {/* ── Form Header ── */}
      <div className="p-5 sm:p-6 border border-border rounded-2xl bg-card shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono font-bold text-primary border-primary/20">
            {offering.course_curriculum.course.initialism} -{" "}
            {offering.course_curriculum.course.name}
          </Badge>
          {is_submitted && (
            <Badge className="bg-success/15 text-success border-success/20 font-semibold gap-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
            </Badge>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">{form.title}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Evaluating: <strong className="text-foreground">{facultyName}</strong> (
          {offering.class.program.initialism} {offering.class.year_level}-{offering.class.section})
        </p>
        {form.description && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            {form.description}
          </p>
        )}
      </div>

      <RatingScaleGuide minRating={form.min_rating} maxRating={form.max_rating} />

      {/* ── Questions Hierarchy ── */}
      <div className="space-y-5">
        {form.categories.map((cat, cIdx) => (
          <div
            key={cat.id}
            className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden"
          >
            <div className="p-3.5 sm:p-4 bg-muted/40 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                {cIdx + 1}. {cat.name}
              </h3>
              {cat.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              )}
            </div>

            <div className="p-3.5 sm:p-4 divide-y divide-border/60">
              {cat.questions.map((q, qIdx) => (
                <div key={q.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    {qIdx + 1}. {q.question}
                  </p>

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

        {/* ── Qualitative Comment Section ── */}
        <div className="p-4 sm:p-5 border border-border rounded-2xl bg-card shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Comments & Constructive Feedback (Optional)</span>
          </div>
          <Textarea
            value={comment}
            disabled={is_submitted}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Share specific observations regarding instructional delivery, strengths, and recommendations..."
            className="min-h-[90px] text-xs sm:text-sm bg-background border-input"
            maxLength={1000}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Selections and text auto-save as draft as you go.</span>
            <span>{comment.length}/1000</span>
          </div>
        </div>
      </div>

      {!is_submitted && (
        <div className="sticky bottom-3 z-20 transition-all duration-200">
          <div className="rounded-2xl border border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {isComplete ? (
                <span className="text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All questions answered
                </span>
              ) : (
                <span>{allQuestions.length - totalRated} question(s) remaining</span>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              disabled={!isComplete || submitMutation.isPending}
              onClick={() => setConfirmSubmitOpen(true)}
              className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              {submitMutation.isPending ? (
                <div className="flex items-center gap-1.5">
                  <Spinner size="xs" className="text-primary-foreground" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Final Evaluation"
              )}
            </Button>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Submit Final Teaching Evaluation?"
        description={
          <span>
            Are you sure you want to finalize your evaluation for <strong>{facultyName}</strong>?
            Once submitted, your ratings and feedback are sealed and cannot be modified.
          </span>
        }
        confirmLabel="Yes, Submit Evaluation"
        variant="primary"
        isLoading={submitMutation.isPending}
        onConfirm={handleFinalSubmit}
      />
    </div>
  );
}
