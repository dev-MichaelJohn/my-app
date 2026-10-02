import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileSpreadsheet, Sparkles } from "lucide-react";
import type { AnnexCFacultyReport } from "@my-app/shared";
import { Can } from "@/components/Can";

interface Props {
  reports: AnnexCFacultyReport[];
  onSelectReport: (report: AnnexCFacultyReport) => void;
  onGenerateClick?: () => void;
  canGenerate?: boolean;
}

export function ReportTableView({
  reports,
  onSelectReport,
  onGenerateClick,
  canGenerate = false,
}: Props) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card space-y-3">
        <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
        <h3 className="font-semibold text-foreground">No evaluation reports found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No consolidated reports exist for the selected filters. You can generate reports for all
          faculty teaching in this semester.
        </p>
        {canGenerate && onGenerateClick && (
          <Can anyRole={["SYS_ADMIN", "ADMIN"]}>
            <div className="pt-2">
              <Button
                onClick={onGenerateClick}
                size="sm"
                className="gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Reports for Semester</span>
              </Button>
            </div>
          </Can>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Faculty Member</TableHead>
            <TableHead className="font-bold">Department / College</TableHead>
            <TableHead className="text-center font-bold">SET Rating</TableHead>
            <TableHead className="text-center font-bold">SEF Rating</TableHead>
            <TableHead className="text-center font-bold">Students / Classes</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow
              key={report.id}
              onClick={() => onSelectReport(report)}
              className="border-border hover:bg-muted/30 transition cursor-pointer"
            >
              <TableCell>
                <p className="font-bold text-sm text-foreground">{report.faculty_name}</p>
                <p className="text-xs text-muted-foreground">{report.faculty_rank}</p>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-foreground">
                  {report.department_college}
                </span>
                {report.program_code && (
                  <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                    {report.program_code}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center font-mono font-bold text-primary">
                {report.overall_set_rating.toFixed(2)}
              </TableCell>
              <TableCell className="text-center font-mono font-bold text-success">
                {report.overall_sef_rating !== null ? report.overall_sef_rating.toFixed(2) : "—"}
              </TableCell>
              <TableCell className="text-center text-xs font-mono text-muted-foreground">
                {report.total_students_evaluated} / {report.total_classes}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold ${
                    report.status === "PUBLISHED"
                      ? "border-success/40 text-success bg-success/10"
                      : report.status === "FINALIZED"
                        ? "border-info/40 text-info bg-info/10"
                        : "border-warning/40 text-warning bg-warning/10"
                  }`}
                >
                  {report.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectReport(report);
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
