import { useNavigate } from "react-router";
import { EvaluationCountdownWidget } from "./EvaluationCountdownWidget";
import { LiveEvaluationTicker } from "./LiveEvaluationTicker";
import { ParticipationDonutChart } from "./ParticipationDonutChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, UserCheck, ChevronRight, GraduationCap } from "lucide-react";
import {
  useSupervisorOfferings,
  useFacultyTeachingOfferings,
} from "@/features/evaluations/hooks/useEvaluationSubmissions";
import type { DashboardOverviewStats, LiveEvaluationPulseEvent, GetUser } from "@my-app/shared";

interface Props {
  user: GetUser;
  data: DashboardOverviewStats;
  pulses: LiveEvaluationPulseEvent[];
  isDean: boolean;
  isChair: boolean;
}

export function DeanChairDashboardView({ user, data, pulses, isDean }: Props) {
  const navigate = useNavigate();
  const { data: supervisorOfferings } = useSupervisorOfferings();
  const { data: myTeachingClasses } = useFacultyTeachingOfferings();

  const { activeSchedule, metrics } = data;

  // Filter pending supervisor evaluations (SEF)
  const pendingSefOfferings = (supervisorOfferings ?? []).filter((o) => !o.has_submitted);

  return (
    <div className="space-y-6">
      {/* ── Welcome & Office Scope ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {isDean ? "College Dean Cockpit" : "Program Chair Cockpit"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Supervisory oversight for {user.details.first_name} {user.details.last_name}
          </p>
        </div>
      </div>

      <EvaluationCountdownWidget schedule={activeSchedule} />

      {/* ── Mid Section: Department Ticker + Turnout Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveEvaluationTicker pulses={pulses} isOpen={activeSchedule.isOpen} maxHeight="300px" />
        </div>
        <div>
          <ParticipationDonutChart
            completed={metrics.completedStudentEvaluations}
            pending={metrics.pendingStudentEvaluations}
            percentage={metrics.completionPercentage}
            title={isDean ? "College Evaluation Turnout" : "Program Evaluation Turnout"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 1. Action List: Pending SEF Evaluations ── */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Supervisory Evaluations (SEF) Pending</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Faculty members awaiting your supervisory assessment.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                pendingSefOfferings.length > 0
                  ? "text-warning border-warning/30 font-bold"
                  : "text-success font-bold"
              }
            >
              {pendingSefOfferings.length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-border/60">
            {pendingSefOfferings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                All supervisory evaluations for this term have been completed!
              </p>
            ) : (
              pendingSefOfferings.slice(0, 5).map((item) => (
                <div
                  key={item.offering.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {item.offering.faculty?.details.first_name}{" "}
                      {item.offering.faculty?.details.last_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {item.offering.course_curriculum.course.initialism} (
                      {item.offering.class.program.initialism} {item.offering.class.year_level}-
                      {item.offering.class.section})
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/evaluations/supervisor")}
                    className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Evaluate Now
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── 2. FR-33 Low Participation Warning (< 50% response) ── */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span>Follow-Up: Low Participation Classes</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Classes with &lt; 50% turnout requiring reminder follow-up.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-3 divide-y divide-border/60">
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              Active class sections are maintaining healthy response rates!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. If Dean / Chair also teaches classes ── */}
      {myTeachingClasses && myTeachingClasses.length > 0 && (
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>My Teaching Classes</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/faculty/classes")}
                className="text-xs h-7 gap-1"
              >
                <span>View Full Roster</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {myTeachingClasses.map((item) => (
              <div
                key={item.offering.id}
                className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1.5 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground font-mono">
                    {item.offering.course_curriculum.course.initialism}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.completion_rate}% Done
                  </Badge>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${item.completion_rate}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {item.total_evaluated} of {item.total_students} students evaluated
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
