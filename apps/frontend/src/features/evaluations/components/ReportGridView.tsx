import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileSpreadsheet, Users, School } from "lucide-react";
import type { AnnexCFacultyReport } from "@my-app/shared";

interface Props {
  reports: AnnexCFacultyReport[];
  onSelectReport: (report: AnnexCFacultyReport) => void;
}

export function ReportGridView({ reports, onSelectReport }: Props) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
        <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
        <h3 className="font-semibold text-foreground">No evaluation reports found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting the semester, college, or program filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <Card
          key={report.id}
          onClick={() => onSelectReport(report)}
          className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {report.semester_term}
                </Badge>
                {report.program_code && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {report.program_code}
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-base text-foreground mt-2 group-hover:text-primary transition line-clamp-1">
                {report.faculty_name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {report.department_college}
              </p>
            </div>

            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold shrink-0 ${
                report.status === "PUBLISHED"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : report.status === "FINALIZED"
                    ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                    : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              }`}
            >
              {report.status}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {/* Rating Scores Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/60">
              <div className="text-center border-r border-border/60 pr-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">SET Score</p>
                <p className="text-lg font-extrabold text-primary font-mono">
                  {report.overall_set_rating.toFixed(2)}
                </p>
              </div>
              <div className="text-center pl-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">SEF Score</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {report.overall_sef_rating !== null ? report.overall_sef_rating.toFixed(2) : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {report.total_students_evaluated} students
              </span>
              <span className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" /> {report.total_classes} classes
              </span>
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Report #{report.id}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1 group-hover:text-primary"
            >
              <span>View Report</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
