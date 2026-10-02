import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, ShieldCheck, Lock } from "lucide-react";
import { SentimentBadge } from "./SentimentBadge";
import type { AnnexCFacultyReport } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
}

export function AnnexCDocument({ report }: Props) {
  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
      {/* Document Top Bar */}
      <div className="flex justify-between items-start border-b border-border pb-4 print:border-black">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] uppercase">
            Status: {report.status}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Formula: {report.calculation_formula}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] gap-1 text-muted-foreground border-border"
          >
            <Lock className="w-3 h-3" /> Confidential Anonymized
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">
            ANNEX C — Individual Faculty Evaluation Report
          </p>
          <p className="text-[10px] text-muted-foreground print:text-gray-600">
            PIT-FES Automated Evaluation Services
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground uppercase print:text-black">
          INDIVIDUAL FACULTY EVALUATION REPORT
        </h2>
        <p className="text-xs text-muted-foreground print:text-gray-600">
          Palompon Institute of Technology — Quality Assurance & Faculty Evaluation Office
        </p>
      </div>

      {/* SECTION A: Faculty Information */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
          A. Faculty Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-xs bg-muted/30 p-4 rounded-xl border border-border/70 print:border-black print:bg-transparent">
          <div className="flex justify-between sm:justify-start gap-4">
            <span className="text-muted-foreground font-medium w-48 print:text-black">
              Name of Faculty Evaluated
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
              Semester / Term & Academic Year
            </span>
            <span className="font-semibold text-foreground print:text-black">
              : {report.semester_term} / {report.school_year}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION B: Summary of Average SET Rating */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
              B. Summary of Average SET Rating
            </h3>
            <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5 leading-relaxed print:text-gray-700">
              <p>
                <strong>Computation:</strong> Step 1: Average SET rating per class. Step 2: Multiply
                students by rating for Weighted SET score. Step 3: Divide total weighted score by
                total students.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Anonymized per CMO 19 s. 2025 Sec 6.10
          </span>
        </div>

        <div className="border border-border rounded-xl overflow-hidden print:border-black">
          <Table>
            <TableHeader className="bg-muted/60 print:bg-gray-100">
              <TableRow className="border-border text-xs print:border-black">
                <TableHead className="w-14 text-center font-bold text-foreground print:text-black">
                  Seq
                </TableHead>
                <TableHead className="font-bold text-foreground print:text-black">
                  (1) Course Code
                </TableHead>
                <TableHead className="font-bold text-foreground print:text-black">
                  (2) Year / Section
                </TableHead>
                <TableHead className="text-center font-bold text-foreground print:text-black">
                  (3) No. of Students
                </TableHead>
                <TableHead className="text-right font-bold text-foreground print:text-black">
                  (4) Average SET Rating
                </TableHead>
                <TableHead className="text-right font-bold text-foreground print:text-black">
                  (3 × 4) Weighted SET Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.class_breakdown.map((row) => (
                <TableRow key={row.seq} className="border-border text-xs print:border-black">
                  <TableCell className="text-center font-mono font-medium">{row.seq}</TableCell>
                  <TableCell className="font-bold font-mono text-primary print:text-black">
                    {row.courseCode}
                  </TableCell>
                  <TableCell className="font-medium">{row.yearSection}</TableCell>
                  <TableCell className="text-center font-mono">{row.noOfStudents}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {row.averageSetRating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {row.weightedScore.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals */}
              <TableRow className="bg-muted/40 font-bold text-xs border-t-2 border-border print:border-black print:bg-gray-50">
                <TableCell colSpan={3} className="text-center uppercase tracking-wider">
                  TOTAL
                </TableCell>
                <TableCell className="text-center font-mono text-sm">
                  {report.total_students_evaluated}
                </TableCell>
                <TableCell className="text-center uppercase tracking-wider">TOTAL</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {report.total_weighted_score.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SECTION C: SET and SEF Ratings */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
            C. SET and SEF Ratings
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 print:text-gray-700">
            <strong>Computation:</strong> Overall SET Rating = Total Weighted Score ÷ Total Students
            ({report.total_weighted_score.toFixed(2)} ÷ {report.total_students_evaluated} ={" "}
            <strong className="text-primary print:text-black">
              {report.overall_set_rating.toFixed(2)}
            </strong>
            ).
          </p>
        </div>

        <div className="border border-border rounded-xl overflow-hidden print:border-black">
          <Table>
            <TableHeader className="bg-muted/60 print:bg-gray-100">
              <TableRow className="border-border text-xs print:border-black">
                <TableHead className="w-1/2"></TableHead>
                <TableHead className="text-center font-bold text-foreground print:text-black">
                  SET Rating (Students)
                </TableHead>
                <TableHead className="text-center font-bold text-foreground print:text-black">
                  *SEF Rating (Supervisor)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border text-sm font-bold print:border-black">
                <TableCell className="uppercase tracking-wider">OVERALL RATING</TableCell>
                <TableCell className="text-center text-primary font-mono text-base print:text-black">
                  {report.overall_set_rating.toFixed(2)}
                </TableCell>
                <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-mono text-base print:text-black">
                  {report.overall_sef_rating !== null
                    ? report.overall_sef_rating.toFixed(2)
                    : "N/A"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="text-[10px] text-muted-foreground italic print:text-gray-600">
          *Note: Evaluated separately using the SEF instrument (no 60/40 ratio applied per CMO 19 s.
          2025).
        </p>
      </div>

      {/* SECTION D: Qualitative Feedback */}
      <div className="space-y-3 pt-2 border-t border-border print:border-black">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary print:text-black" />
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide print:text-black">
            D. Summary of Qualitative Comments and Suggestions
          </h3>
        </div>

        {/* Student Comments */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider print:text-black">
            Comments and Suggestions from the Students (Curated Representative Excerpts):
          </h4>
          {report.student_comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No student comments submitted.</p>
          ) : (
            report.student_comments.map((tc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-border/80 bg-background text-xs space-y-1.5 print:border-gray-400 print:bg-transparent"
              >
                <div className="flex justify-between items-center">
                  <SentimentBadge classification={tc.sentiment} score={tc.score} />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Comment #{idx + 1}
                  </span>
                </div>
                <p className="text-foreground italic leading-relaxed print:text-black">
                  "{tc.comment}"
                </p>
              </div>
            ))
          )}
        </div>

        {/* Supervisor Comments */}
        <div className="space-y-2 pt-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider print:text-black">
            Comments and Suggestions from the Supervisor:
          </h4>
          {report.supervisor_comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No supervisor remarks recorded.</p>
          ) : (
            report.supervisor_comments.map((sc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-border/80 bg-background text-xs space-y-1 print:border-gray-400 print:bg-transparent"
              >
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {sc.evaluator_name} ({sc.evaluator_role})
                  </span>
                  <span>{new Date(sc.submitted_at).toLocaleDateString()}</span>
                </div>
                <p className="text-foreground leading-relaxed print:text-black">{sc.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Sign-Off Lines */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t border-border print:border-black text-xs">
        <div className="space-y-4 text-center">
          <div className="h-10 border-b border-border flex items-end justify-center pb-1 font-semibold text-foreground print:border-black print:text-black">
            PIT-FES Designated Evaluation Office
          </div>
          <p className="font-semibold text-foreground print:text-black">
            Prepared by (Designated Office / Staff)
          </p>
        </div>
        <div className="space-y-4 text-center">
          <div className="h-10 border-b border-border flex items-end justify-center pb-1 font-semibold text-foreground print:border-black print:text-black">
            {report.college_name
              ? `${report.college_name} Dean's Office`
              : "College Dean / Authorized Official"}
          </div>
          <p className="font-semibold text-foreground print:text-black">
            Reviewed by (Authorized Official / College Dean)
          </p>
        </div>
      </div>
    </Card>
  );
}
