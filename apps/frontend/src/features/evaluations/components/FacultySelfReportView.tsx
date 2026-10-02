import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { ReportAnalyticsCharts } from "./ReportAnalyticsCharts";
import { FedafActionSection } from "./FedafActionSection";
import { downloadAnnexCPdf, downloadAnnexDPdf } from "../lib/report-export.lib";
import { Download, Clock, GraduationCap, CheckCircle } from "lucide-react";
import type { AnnexCFacultyReport, GetUser, ISemesterSelect } from "@my-app/shared";

interface Props {
  report?: AnnexCFacultyReport | null | undefined;
  isLoading: boolean;
  user?: GetUser | null | undefined;
  semesters: ISemesterSelect[];
  selectedSemesterId?: number | undefined;
  onSemesterChange: (id: number) => void;
}

export function FacultySelfReportView({
  report,
  isLoading,
  user,
  semesters,
  selectedSemesterId,
  onSemesterChange,
}: Props) {
  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);

  // 🚀 Dynamic Lifecycle & Signature Status
  const isSupervisorSigned = Boolean(report?.fedaf_plan?.supervisor_signed_at);
  const isFacultySigned = Boolean(report?.fedaf_plan?.faculty_signed_at);

  const renderStatusBadge = () => {
    if (!report) return null;

    if (isSupervisorSigned && isFacultySigned) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10px] gap-1">
          <CheckCircle className="w-3 h-3" /> Fully Signed & Certified
        </Badge>
      );
    }

    if (report.status === "PUBLISHED" || isSupervisorSigned) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold text-[10px] gap-1">
          <Clock className="w-3 h-3" /> Published (Awaiting Your Signature)
        </Badge>
      );
    }

    if (report.status === "FINALIZED") {
      return (
        <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold text-[10px] gap-1">
          <Clock className="w-3 h-3" /> Finalized (Pending Supervisor Plan)
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[10px] gap-1">
        <Clock className="w-3 h-3" /> Draft (Pending Supervisory Review)
      </Badge>
    );
  };

  return (
    // 🚀 Now uses w-full to match the exact size of the other faculty views
    <div className="space-y-6 w-full">
      {/* ── Personalized Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              My Teaching Evaluation & Performance
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Welcome, {user?.details.first_name} {user?.details.last_name} (
              {user?.details.institutional_id})
            </p>
          </div>
        </div>

        {/* Semester Switcher */}
        <div className="w-full sm:w-64">
          <Select
            value={selectedSemesterId ? String(selectedSemesterId) : ""}
            onValueChange={(val) => onSemesterChange(Number(val))}
          >
            <SelectTrigger className="w-full bg-background border-input text-xs h-9">
              <SelectValue placeholder="Select Semester">
                {currentSemester ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {currentSemester.semester_term} Sem
                    </strong>
                    <span className="text-muted-foreground">
                      ({currentSemester.school_year_start}-{currentSemester.school_year_end})
                    </span>
                  </span>
                ) : (
                  "Select Semester"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content States ── */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading evaluation results...
          </p>
        </div>
      ) : !report ? (
        <div className="text-center py-20 px-6 border border-dashed border-border rounded-2xl bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">
            Evaluation Report Pending Supervisory Review
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your evaluation results for the{" "}
            <strong>{currentSemester?.semester_term} Semester</strong> are currently being processed
            and reviewed by your academic supervisor.
          </p>
          <p className="text-[11px] text-muted-foreground/80 max-w-md mx-auto">
            Under CHED CMO 19 s. 2025, your supervisor will schedule an individual feedback meeting
            before publishing your official Annex C report and FEDAF development plan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score & Action Bar */}
          <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Student Rating (SET)
                </span>
                <span className="text-xl font-extrabold font-mono text-primary">
                  {report.overall_set_rating.toFixed(2)}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Supervisor Rating (SEF)
                </span>
                <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {report.overall_sef_rating !== null
                    ? report.overall_sef_rating.toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Report Status
                </span>
                {renderStatusBadge()}
              </div>
            </div>

            {/* Download Documents Button */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official Documents</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-popover border-border text-xs">
                <DropdownMenuItem
                  onClick={() => downloadAnnexCPdf(report)}
                  className="cursor-pointer gap-2 py-2"
                >
                  <span className="font-bold text-primary">Annex C</span>
                  <span>— Evaluation Report (IFER)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => downloadAnnexDPdf(report)}
                  className="cursor-pointer gap-2 py-2"
                >
                  <span className="font-bold text-emerald-600">Annex D</span>
                  <span>— Acknowledgment Plan (FEDAF)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Visual Analytics */}
          <ReportAnalyticsCharts report={report} />

          {/* FEDAF Development Plan & Signatures */}
          <FedafActionSection report={report} currentUser={user} isPrivileged={false} />
        </div>
      )}
    </div>
  );
}
