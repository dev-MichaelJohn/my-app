import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EvaluationCountdownWidget } from "./EvaluationCountdownWidget";
import { FileSpreadsheet, ChevronRight } from "lucide-react";
import {
  useFacultyTeachingOfferings,
  useAnnexCReport,
} from "@/features/evaluations/hooks/useEvaluationSubmissions";
import type { DashboardOverviewStats, GetUser } from "@my-app/shared";

interface Props {
  user: GetUser;
  data: DashboardOverviewStats;
}

export function FacultyDashboardView({ user, data }: Props) {
  const navigate = useNavigate();
  const { data: classes, isLoading } = useFacultyTeachingOfferings();
  const { data: myReport } = useAnnexCReport(undefined, user.account.id);

  const { activeSchedule } = data;

  return (
    <div className="space-y-6">
      <EvaluationCountdownWidget schedule={activeSchedule} />

      {/* ── FR-32 Report Status Notification Banner ── */}
      {myReport && (
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Individual Evaluation Report (Annex C)
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <strong className="text-foreground">{myReport.status}</strong> • SET Score:{" "}
                <strong className="text-primary font-mono">
                  {myReport.overall_set_rating.toFixed(2)}
                </strong>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/reports/faculty")}
            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <span>View Full Report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ── Class Response Rates (FR-32) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              My Teaching Classes (SET Progress)
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitor real-time student evaluation progress across your assigned subjects.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/faculty/classes")}
            className="text-xs h-8 gap-1.5"
          >
            <span>Detailed Roster</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Spinner size="md" />
          </div>
        ) : !classes || classes.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border bg-card">
            <p className="text-xs text-muted-foreground italic">
              No course offerings assigned to you for the active term.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((item) => (
              <Card key={item.offering.id} className="border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono font-bold text-primary">
                      {item.offering.course_curriculum.course.initialism}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {item.offering.class.program.initialism} {item.offering.class.year_level}-
                      {item.offering.class.section}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold truncate mt-1">
                    {item.offering.course_curriculum.course.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-1 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Response Rate:</span>
                    <strong className="text-foreground font-mono">{item.completion_rate}%</strong>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${item.completion_rate}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.total_evaluated} of {item.total_students} students submitted
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
