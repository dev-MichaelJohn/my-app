import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  History,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useStudentForm, useSupervisorForm } from "../hooks/useEvaluationInstruments";
import {
  useAddStudentCategory,
  useUpdateStudentCategory,
  useDeleteStudentCategory,
  useAddStudentQuestion,
  useUpdateStudentQuestion,
  useDeleteStudentQuestion,
  useReorderStudentQuestions,
  useAddSupervisorCategory,
  useUpdateSupervisorCategory,
  useDeleteSupervisorCategory,
  useAddSupervisorQuestion,
  useUpdateSupervisorQuestion,
  useDeleteSupervisorQuestion,
  useAddMeansDescriptor,
  useDeleteMeansDescriptor,
} from "../hooks/useEvaluationBuilder";
import { FormBuilderSkeleton } from "../components/EvaluationInstrumentSkeletons";
import { VersionHistoryDialog } from "../components/VersionHistoryDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type { ApiError } from "@/lib/api.lib";

export default function EvaluationFormBuilderPage() {
  const { type, id } = useParams<{ type: "student" | "supervisor"; id: string }>();
  const formId = Number(id);
  const isStudent = type === "student";

  // Fetch Full Form Tree
  const studentFormQuery = useStudentForm(formId, isStudent);
  const supervisorFormQuery = useSupervisorForm(formId, !isStudent);

  const form = isStudent ? studentFormQuery.data : supervisorFormQuery.data;
  const isLoading = isStudent ? studentFormQuery.isLoading : supervisorFormQuery.isLoading;

  // ── SET Builder Mutations ──
  const addStudentCat = useAddStudentCategory(formId);
  const updateStudentCat = useUpdateStudentCategory(formId);
  const deleteStudentCat = useDeleteStudentCategory(formId);
  const addStudentQ = useAddStudentQuestion(formId);
  const updateStudentQ = useUpdateStudentQuestion(formId);
  const deleteStudentQ = useDeleteStudentQuestion(formId);
  const reorderStudentQ = useReorderStudentQuestions(formId);

  // ── SEF Builder Mutations ──
  const addSupervisorCat = useAddSupervisorCategory(formId);
  const updateSupervisorCat = useUpdateSupervisorCategory(formId);
  const deleteSupervisorCat = useDeleteSupervisorCategory(formId);
  const addSupervisorQ = useAddSupervisorQuestion(formId);
  const updateSupervisorQ = useUpdateSupervisorQuestion(formId);
  const deleteSupervisorQ = useDeleteSupervisorQuestion(formId);
  const addMeans = useAddMeansDescriptor(formId);
  const deleteMeans = useDeleteMeansDescriptor(formId);

  // ── Loading Flags ──
  const isSavingCat = addStudentCat.isPending || addSupervisorCat.isPending;
  const isUpdatingCat = updateStudentCat.isPending || updateSupervisorCat.isPending;
  const isSavingQ = addStudentQ.isPending || addSupervisorQ.isPending;
  const isUpdatingQ = updateStudentQ.isPending || updateSupervisorQ.isPending;
  const isSavingMeans = addMeans.isPending;
  const isDeletingCat = deleteStudentCat.isPending || deleteSupervisorCat.isPending;
  const isDeletingQ = deleteStudentQ.isPending || deleteSupervisorQ.isPending;

  // ── In-Place Creation States ──
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [activeAddingCat, setActiveAddingCat] = useState(false);

  const [activeAddingQuestionCatId, setActiveAddingQuestionCatId] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");

  const [activeAddingMeansQId, setActiveAddingMeansQId] = useState<number | null>(null);
  const [newMeansText, setNewMeansText] = useState("");

  // ── In-Place Editing States ──
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");

  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [editQText, setEditQText] = useState("");

  // ── Deletion Target States (Friction) ──
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteQTarget, setDeleteQTarget] = useState<{ id: number; text: string } | null>(null);

  // Version History Modal State
  const [historyTarget, setHistoryTarget] = useState<{
    id: number;
    title: string;
    type:
      | "student-category"
      | "student-question"
      | "supervisor-category"
      | "supervisor-question"
      | "means";
  } | null>(null);

  if (isLoading) return <FormBuilderSkeleton />;
  if (!form)
    return <div className="p-8 text-center text-muted-foreground">Evaluation form not found.</div>;

  // ── Creation Handlers ──
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      if (isStudent) {
        await addStudentCat.mutateAsync({
          form_id: form.id,
          name: newCatName,
          description: newCatDesc,
          order: form.categories.length + 1,
        });
      } else {
        await addSupervisorCat.mutateAsync({
          form_id: form.id,
          name: newCatName,
          description: newCatDesc,
          order: form.categories.length + 1,
        });
      }
      setNewCatName("");
      setNewCatDesc("");
      setActiveAddingCat(false);
      toast.success("Category added.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to add category.");
    }
  };

  const handleCreateQuestion = async (categoryId: number) => {
    if (!newQuestionText.trim()) return;
    const currentCat = form.categories.find((c) => c.id === categoryId);
    const nextOrder = (currentCat?.questions.length ?? 0) + 1;

    try {
      if (isStudent) {
        await addStudentQ.mutateAsync({
          categoryId,
          info: {
            category_id: categoryId,
            question: newQuestionText.trim(),
            max_rating: form.max_rating,
            order: nextOrder,
          },
        });
      } else {
        await addSupervisorQ.mutateAsync({
          categoryId,
          info: {
            category_id: categoryId,
            question: newQuestionText.trim(),
            max_rating: form.max_rating,
            order: nextOrder,
          },
        });
      }
      setNewQuestionText("");
      setActiveAddingQuestionCatId(null);
      toast.success("Question added.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to add question.");
    }
  };

  const handleCreateMeans = async (questionId: number) => {
    if (!newMeansText.trim()) return;

    const question = form.categories
      .flatMap((cat) => cat.questions)
      .find((candidate) => candidate.id === questionId);
    const nextOrder = ((question as any)?.means?.length ?? 0) + 1;

    try {
      await addMeans.mutateAsync({
        questionId,
        info: {
          question_id: questionId,
          descriptor: newMeansText,
          order: nextOrder,
        },
      });
      setNewMeansText("");
      setActiveAddingMeansQId(null);
      toast.success("MOV Descriptor added.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to add MOV.");
    }
  };

  // ── Update Handlers (Versioned) ──
  const handleSaveEditCategory = async (categoryId: number) => {
    if (!editCatName.trim()) return;
    try {
      if (isStudent) {
        await updateStudentCat.mutateAsync({
          categoryId,
          info: { name: editCatName, description: editCatDesc },
        });
      } else {
        await updateSupervisorCat.mutateAsync({
          categoryId,
          info: { name: editCatName, description: editCatDesc },
        });
      }
      setEditingCatId(null);
      toast.success("Category updated to new revision.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to update category.");
    }
  };

  const handleSaveEditQuestion = async (questionId: number) => {
    if (!editQText.trim()) return;
    try {
      if (isStudent) {
        await updateStudentQ.mutateAsync({ questionId, info: { question: editQText } });
      } else {
        await updateSupervisorQ.mutateAsync({ questionId, info: { question: editQText } });
      }
      setEditingQId(null);
      toast.success("Question updated to new revision.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to update question.");
    }
  };

  // ── Reorder Questions ──
  const handleMoveQuestion = async (categoryId: number, qIdx: number, direction: "up" | "down") => {
    const category = form.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const questions = [...category.questions];
    const targetIdx = direction === "up" ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[qIdx]!;
    questions[qIdx] = questions[targetIdx]!;
    questions[targetIdx] = temp;

    const orderedIds = questions.map((q) => q.id);

    try {
      if (isStudent) {
        await reorderStudentQ.mutateAsync({ categoryId, orderedIds });
      }
      toast.success("Question order updated.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to reorder questions.");
    }
  };

  // ── Confirmed Deletions ──
  const handleConfirmDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      if (isStudent) await deleteStudentCat.mutateAsync(deleteCatTarget.id);
      else await deleteSupervisorCat.mutateAsync(deleteCatTarget.id);
      toast.success(`Category "${deleteCatTarget.name}" archived.`);
      setDeleteCatTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to archive category.");
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!deleteQTarget) return;
    try {
      if (isStudent) await deleteStudentQ.mutateAsync(deleteQTarget.id);
      else await deleteSupervisorQ.mutateAsync(deleteQTarget.id);
      toast.success("Question archived.");
      setDeleteQTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to archive question.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link to="/admin/evaluation-forms">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Questionnaires</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {form.min_rating} – {form.max_rating} Rating Scale
          </Badge>
          <Badge variant="secondary" className="capitalize text-xs font-semibold">
            {isStudent ? "Student (SET)" : "Supervisor (SEF)"}
          </Badge>
        </div>
      </div>

      {/* ── Form Header ── */}
      <div className="p-6 border border-border rounded-2xl bg-card shadow-xs space-y-2">
        <h1 className="text-2xl font-extrabold text-foreground">{form.title}</h1>
        {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
      </div>

      {/* ── Categories & Questions Hierarchy ── */}
      <div className="space-y-6">
        {form.categories.map((cat, catIdx) => (
          <div
            key={cat.id}
            className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden"
          >
            {/* Category Header */}
            <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                  {catIdx + 1}
                </span>

                {editingCatId === cat.id ? (
                  /* Inline Edit Category with Spinner */
                  <div className="flex-1 space-y-2 py-1">
                    <Input
                      value={editCatName}
                      disabled={isUpdatingCat}
                      onChange={(e) => setEditCatName(e.target.value)}
                      placeholder="Category Name"
                      className="text-sm h-8 bg-background"
                    />
                    <Input
                      value={editCatDesc}
                      disabled={isUpdatingCat}
                      onChange={(e) => setEditCatDesc(e.target.value)}
                      placeholder="Optional description"
                      className="text-xs h-7 bg-background"
                    />
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        disabled={isUpdatingCat || !editCatName.trim()}
                        className="h-7 text-xs gap-1.5"
                        onClick={() => handleSaveEditCategory(cat.id)}
                      >
                        {isUpdatingCat ? (
                          <>
                            <Spinner size="xs" className="text-primary-foreground" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isUpdatingCat}
                        className="h-7 text-xs"
                        onClick={() => setEditingCatId(null)}
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Standard Display Category */
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        v{cat.version}
                      </span>
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Category Action Buttons */}
              {editingCatId !== cat.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setEditCatName(cat.name);
                      setEditCatDesc(cat.description || "");
                    }}
                    title="Edit Category Name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() =>
                      setHistoryTarget({
                        id: cat.id,
                        title: cat.name,
                        type: isStudent ? "student-category" : "supervisor-category",
                      })
                    }
                    title="View Revision History"
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteCatTarget({ id: cat.id, name: cat.name })}
                    title="Archive Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="p-4 space-y-3">
              {cat.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-3.5 border border-border/80 rounded-xl bg-background space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground mt-0.5">
                        {qIdx + 1}.
                      </span>

                      {editingQId === q.id ? (
                        /* Inline Edit Question with Spinner */
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={editQText}
                            disabled={isUpdatingQ}
                            onChange={(e) => setEditQText(e.target.value)}
                            className="text-sm min-h-[60px] bg-card"
                          />
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              disabled={isUpdatingQ || !editQText.trim()}
                              className="h-7 text-xs gap-1.5"
                              onClick={() => handleSaveEditQuestion(q.id)}
                            >
                              {isUpdatingQ ? (
                                <>
                                  <Spinner size="xs" className="text-primary-foreground" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save Revision</span>
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isUpdatingQ}
                              className="h-7 text-xs"
                              onClick={() => setEditingQId(null)}
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Question */
                        <div>
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {q.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              v{q.version}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              • Max Rating: {q.max_rating}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Actions & Reorder */}
                    {editingQId !== q.id && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground disabled:opacity-20"
                          disabled={qIdx === 0 || reorderStudentQ.isPending}
                          onClick={() => handleMoveQuestion(cat.id, qIdx, "up")}
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground disabled:opacity-20"
                          disabled={qIdx === cat.questions.length - 1 || reorderStudentQ.isPending}
                          onClick={() => handleMoveQuestion(cat.id, qIdx, "down")}
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => {
                            setEditingQId(q.id);
                            setEditQText(q.question);
                          }}
                          title="Edit Question Text"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() =>
                            setHistoryTarget({
                              id: q.id,
                              title: q.question,
                              type: isStudent ? "student-question" : "supervisor-question",
                            })
                          }
                          title="View Question History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteQTarget({ id: q.id, text: q.question })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ── Supervisor Means of Verification (MOVs) ── */}
                  {!isStudent && "means" in q && (
                    <div className="pt-2 border-t border-border/50 pl-6 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Means of Verification (MOVs / Descriptors):
                      </p>
                      <div className="space-y-1">
                        {(q as any).means?.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                          >
                            <span>
                              • {m.descriptor}{" "}
                              <span className="text-[10px] font-mono text-muted-foreground">
                                (v{m.version})
                              </span>
                            </span>
                            <button
                              type="button"
                              disabled={deleteMeans.isPending}
                              onClick={() => deleteMeans.mutate(m.id)}
                              className="text-destructive hover:underline text-[11px]"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add MOV Input with Spinner */}
                      {activeAddingMeansQId === q.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            value={newMeansText}
                            disabled={isSavingMeans}
                            onChange={(e) => setNewMeansText(e.target.value)}
                            placeholder="Type MOV descriptor (e.g. Syllabus, Lesson Plan)..."
                            className="h-8 text-xs bg-card"
                          />
                          <Button
                            size="sm"
                            disabled={isSavingMeans || !newMeansText.trim()}
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handleCreateMeans(q.id)}
                          >
                            {isSavingMeans ? (
                              <>
                                <Spinner size="xs" className="text-primary-foreground" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSavingMeans}
                            className="h-8 text-xs"
                            onClick={() => setActiveAddingMeansQId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveAddingMeansQId(q.id)}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add MOV Descriptor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add Question Button / Inline Form with Spinner */}
              {activeAddingQuestionCatId === cat.id ? (
                <div className="p-3 border border-dashed border-primary/40 rounded-xl bg-primary/5 space-y-2">
                  <Input
                    value={newQuestionText}
                    disabled={isSavingQ}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Enter questionnaire question text..."
                    className="bg-card text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSavingQ}
                      onClick={() => setActiveAddingQuestionCatId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSavingQ || !newQuestionText.trim()}
                      onClick={() => handleCreateQuestion(cat.id)}
                      className="gap-1.5"
                    >
                      {isSavingQ ? (
                        <>
                          <Spinner size="xs" className="text-primary-foreground" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        "Save Question"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveAddingQuestionCatId(cat.id)}
                  className="w-full text-xs gap-1.5 h-8 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question to {cat.name}</span>
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* ── Add Category Section with Spinner ── */}
        {activeAddingCat ? (
          <div className="p-5 border border-primary/40 rounded-2xl bg-card shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-foreground">Add New Category</h4>
            <Input
              value={newCatName}
              disabled={isSavingCat}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category Name (e.g. Instructional Competence, Professionalism)"
              className="text-sm"
            />
            <Textarea
              value={newCatDesc}
              disabled={isSavingCat}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Optional category description / instructions..."
              className="text-xs min-h-[60px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={isSavingCat}
                onClick={() => setActiveAddingCat(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSavingCat || !newCatName.trim()}
                onClick={handleCreateCategory}
                className="gap-1.5"
              >
                {isSavingCat ? (
                  <>
                    <Spinner size="xs" className="text-primary-foreground" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Category"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setActiveAddingCat(true)}
            className="w-full h-12 gap-2 border-dashed border-border hover:border-primary text-sm font-semibold rounded-2xl bg-card hover:bg-muted"
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            <span>Add New Category Section</span>
          </Button>
        )}
      </div>

      {/* ── FRICTION MODAL 1: Confirm Category Delete ── */}
      <ConfirmActionDialog
        open={Boolean(deleteCatTarget)}
        onOpenChange={(open) => !open && setDeleteCatTarget(null)}
        title={`Archive Category "${deleteCatTarget?.name}"?`}
        description={
          <span>
            Are you sure you want to archive <strong>{deleteCatTarget?.name}</strong>?
            <span className="block mt-2 text-xs font-semibold text-destructive">
              ⚠️ All questions inside this category will also be archived.
            </span>
          </span>
        }
        confirmLabel="Archive Category"
        variant="destructive"
        isLoading={isDeletingCat}
        onConfirm={handleConfirmDeleteCategory}
      />

      {/* ── FRICTION MODAL 2: Confirm Question Delete ── */}
      <ConfirmActionDialog
        open={Boolean(deleteQTarget)}
        onOpenChange={(open) => !open && setDeleteQTarget(null)}
        title="Archive Question?"
        description={
          <span>
            Are you sure you want to archive this question: <em>"{deleteQTarget?.text}"</em>?
          </span>
        }
        confirmLabel="Archive Question"
        variant="destructive"
        isLoading={isDeletingQ}
        onConfirm={handleConfirmDeleteQuestion}
      />

      {/* ── Audit Revision History Modal ── */}
      {historyTarget && (
        <VersionHistoryDialog
          open={Boolean(historyTarget)}
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          target={historyTarget}
        />
      )}
    </div>
  );
}
