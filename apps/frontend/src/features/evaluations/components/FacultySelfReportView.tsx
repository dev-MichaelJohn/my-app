import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AnnexDDocument } from "./AnnexDDocument";
import { downloadAnnexDPdf } from "../lib/report-export.lib";
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

  const isSupervisorSigned = Boolean(report?.fedaf_plan?.supervisor_signed_at);
  const isFacultySigned = Boolean(report?.fedaf_plan?.faculty_signed_at);

  const renderStatusBadge = () => {
    if (!report) return null;

    if (isSupervisorSigned && isFacultySigned) {
      return (
        <Badge className="bg-success/15 text-success border-success/30 font-bold text-[10px] gap-1">
          <CheckCircle className="w-3 h-3" /> Fully Signed & Certified
        </Badge>
      );
    }

    if (report.status === "PUBLISHED" || isSupervisorSigned) {
      return (
        <Badge className="bg-info/15 text-info border-info/30 font-bold text-[10px] gap-1">
          <Clock className="w-3 h-3" /> Published (Awaiting Your Signature)
        </Badge>
      );
    }

    return (
      <Badge className="bg-warning/15 text-warning border-warning/30 font-bold text-[10px] gap-1">
        <Clock className="w-3 h-3" /> Pending Supervisory Review
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* ── Personalized Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              Faculty Development Plan (FEDAF)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.details.first_name} {user?.details.last_name} ({user?.details.institutional_id}
              )
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
          <p className="text-xs text-muted-foreground animate-pulse">Loading development plan...</p>
        </div>
      ) : !report ? (
        <div className="text-center py-20 px-6 border border-dashed border-border rounded-2xl bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-warning/10 text-warning mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">
            FEDAF Development Plan Pending Supervisory Review
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your evaluation results for the{" "}
            <strong>{currentSemester?.semester_term} Semester</strong> are currently being processed
            by your academic supervisor.
          </p>
          <p className="text-[11px] text-muted-foreground/80 max-w-md mx-auto">
            Under CHED CMO 19 s. 2025, your supervisor conducts a personal feedback conference
            before formulating and publishing your official FEDAF development plan (Annex D).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Document
                </span>
                <span className="text-sm font-bold text-foreground">Annex D — FEDAF Form</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Status
                </span>
                {renderStatusBadge()}
              </div>
            </div>

            {/* Faculty can ONLY download Annex D (FEDAF) */}
            <Button
              size="sm"
              onClick={() => downloadAnnexDPdf(report)}
              className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official FEDAF (Annex D)</span>
            </Button>
          </div>

          {/* 🚀 ONLY render Annex D document */}
          <AnnexDDocument report={report} currentUser={user} isPrivileged={false} />
        </div>
      )}
    </div>
  );
}
