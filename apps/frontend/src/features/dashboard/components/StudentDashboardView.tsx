import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EvaluationCountdownWidget } from "./EvaluationCountdownWidget";
import { ParticipationDonutChart } from "./ParticipationDonutChart";
import { ShieldCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { useStudentSubjects } from "@/features/evaluations/hooks/useEvaluationSubmissions";
import type { DashboardOverviewStats, GetUser } from "@my-app/shared";

interface Props {
  user: GetUser;
  data: DashboardOverviewStats;
}

export function StudentDashboardView({ user, data }: Props) {
  const navigate = useNavigate();
  const { data: subjects, isLoading } = useStudentSubjects();

  const { activeSchedule } = data;

  const total = subjects?.length ?? 0;
  const completed = subjects?.filter((s) => s.has_submitted).length ?? 0;
  const pending = Math.max(0, total - completed);
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  const unevaluated = subjects?.filter((s) => !s.has_submitted) ?? [];

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Welcome back, {user.details.first_name}!
        </h1>
        <p className="text-xs text-muted-foreground">
          Complete your official faculty teaching evaluations for this term.
        </p>
      </div>

      <EvaluationCountdownWidget schedule={activeSchedule} />

      {/* ── Privacy Guarantee Strip ── */}
      <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3 text-xs text-foreground">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <span>
          <strong>Confidentiality Guarantee:</strong> Your individual ratings and qualitative
          comments are cryptographically decoupled from your identity. Instructors cannot trace
          ratings to specific students.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Donut */}
        <div>
          <ParticipationDonutChart
            completed={completed}
            pending={pending}
            percentage={percentage}
            title="My Progress"
            subtitle="Subjects evaluated this term"
          />
        </div>

        {/* Priority Unevaluated Subjects */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Pending Subject Evaluations</h2>
              <p className="text-xs text-muted-foreground">
                Complete all required faculty evaluations before the deadline.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/evaluations/student")}
              className="text-xs h-8"
            >
              View All ({total})
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Spinner size="md" />
            </div>
          ) : unevaluated.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-border bg-card">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
              <h3 className="font-bold text-foreground">All Evaluations Completed!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Thank you for participating in faculty evaluation for this semester.
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {unevaluated.map((sub) => {
                const teacher = sub.offering.faculty
                  ? `${sub.offering.faculty.details.first_name} ${sub.offering.faculty.details.last_name}`
                  : "Instructor";

                return (
                  <div
                    key={sub.student_class_id}
                    className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-bold text-primary">
                          {sub.offering.course_curriculum.course.initialism}
                        </Badge>
                        <span className="text-xs font-bold text-foreground truncate">
                          {sub.offering.course_curriculum.course.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Instructor: <strong className="text-foreground">{teacher}</strong>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate("/evaluations/student")}
                      className="text-xs h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                    >
                      <span>{sub.is_draft ? "Resume Draft" : "Evaluate Now"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
