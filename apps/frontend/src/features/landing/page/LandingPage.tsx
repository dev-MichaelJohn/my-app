import { Link, useNavigate } from "react-router";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { useActiveStudentSchedule } from "@/features/evaluation-schedules/hooks/useEvaluationSchedules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  GraduationCap,
  ShieldCheck,
  FileCheck2,
  UserCheck,
  FileSpreadsheet,
  ArrowRight,
  Lock,
  Building2,
  Calendar,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const isAuthenticated = Boolean(token);

  // Only query user & schedule when a session token exists
  const { data: user } = useMe();
  const { data: activeSemester } = useActiveSemester(isAuthenticated);
  const { data: activeSchedule } = useActiveStudentSchedule(activeSemester?.id, isAuthenticated);

  const isScheduleOpen = Boolean(activeSchedule);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs">
              PIT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-foreground">
                  PIT-FES
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-muted-foreground border-l border-border pl-2">
                  Faculty Evaluation System
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Palompon Institute of Technology
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <Button
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/login")}
                className="gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
              >
                <span>Log In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-border bg-muted/20 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Institutional Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border text-xs text-muted-foreground shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isScheduleOpen ? "bg-success animate-pulse" : "bg-primary"
              }`}
            />
            {activeSemester ? (
              <span>
                {activeSemester.semester_term} Semester, A.Y. {activeSemester.school_year_start}-
                {activeSemester.school_year_end}
              </span>
            ) : (
              <span>Palompon Institute of Technology • Official Academic Portal</span>
            )}
            {isScheduleOpen && (
              <Badge variant="outline" className="text-[10px] border-success/40 text-success ml-1">
                Evaluation Window Open
              </Badge>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Advancing Teaching Excellence Through Evidence-Based Assessment
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The official instructional evaluation portal of the Palompon Institute of Technology.
            Facilitating confidential student feedback, supervisory appraisal, and collaborative
            faculty development plans in full alignment with national standards.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                <span>Access Evaluation Portal</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document
                  .getElementById("evaluation-framework")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto h-11 px-5 text-sm border-border bg-background"
            >
              Learn About the Process
            </Button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Compliant with CHED CMO No. 19, Series of 2025 Guidelines</span>
          </div>
        </div>
      </section>

      {/* ── Three Evaluation Pillars ── */}
      <section id="evaluation-framework" className="py-16 md:py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Core Evaluation Framework
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Instructional quality is appraised from distinct pedagogical perspectives to ensure
              balance, fairness, and continuous improvement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Student Evaluation (SET) */}
            <Card className="border-border bg-card shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Student Evaluation of Teachers (SET)
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] mt-1 text-primary border-primary/20"
                  >
                    Annex A Instrument
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enrolled students evaluate faculty instructional competence, classroom management,
                  and punctuality. Individual ratings and qualitative feedback remain completely
                  anonymous.
                </p>
                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>Responses decoupled from student identity</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2: Supervisor Evaluation (SEF) */}
            <Card className="border-border bg-card shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Supervisor's Evaluation of Faculty (SEF)
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] mt-1 text-success border-success/30"
                  >
                    Annex B Instrument
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deans and Program Chairs evaluate faculty members under their direct supervisory
                  chain. Assessments are verified through concrete Means of Verification (MOVs) such
                  as course syllabi and learning materials.
                </p>
                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-success" />
                  <span>Supervisory review by designated heads</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3: Development Plan (FEDAF) */}
            <Card className="border-border bg-card shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-info/15 text-info flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Faculty Development (FEDAF)
                  </h3>
                  <Badge variant="outline" className="text-[10px] mt-1 text-info border-info/30">
                    Annex D Instrument
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Following the evaluation period, supervisors and faculty jointly formulate an
                  action plan identifying specific areas for growth, proposed training, and target
                  milestones with dual acknowledgment signatures.
                </p>
                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-info" />
                  <span>Continuous professional development</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Key Institutional Principles ── */}
      <section className="py-16 bg-muted/20 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Guiding Institutional Principles
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Built on transparency, integrity, and strict confidentiality guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                <span>Strict Anonymity Protection</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Student submissions are decoupled from login accounts upon submission. Class
                breakdown sections and course titles in reports are anonymized to ensure evaluations
                remain impartial and free from potential reprisal.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span>Distinct Metric Separation</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                In strict compliance with CHED CMO 19 s. 2025, student ratings (SET) and supervisory
                appraisals (SEF) are maintained as independent measures. No artificial weighting
                formula is applied, ensuring clarity between classroom experience and administrative
                compliance.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Scheduled Evaluation Windows</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Submissions take place only during designated periods within the academic calendar.
                Reports cannot be prematurely consolidated while evaluations are ongoing, ensuring
                sample integrity and comprehensive data.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>Development Over Sanction</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The primary purpose of PIT-FES is diagnostic rather than punitive. Feedback is used
                to guide institutional seminar planning, departmental mentoring, and personalized
                faculty development plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Common questions regarding evaluation procedures and security.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                Can my instructor see what I submitted?
              </h3>
              <p className="text-muted-foreground leading-relaxed pl-6">
                No. Individual scores and written feedback are completely aggregated. Instructors
                receive consolidated reports showing overall category averages and representative
                feedback excerpts without timestamps or identifying information.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                Who evaluates whom in the supervisory process?
              </h3>
              <p className="text-muted-foreground leading-relaxed pl-6">
                Program Chairs evaluate faculty teaching within their respective academic degree
                programs. College Deans evaluate Program Chairs and oversight personnel. Faculty
                members cannot evaluate themselves or their peers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                What happens after the evaluation period concludes?
              </h3>
              <p className="text-muted-foreground leading-relaxed pl-6">
                Once the schedule closes, individual Annex C (IFER) reports are consolidated.
                Supervisors schedule an evaluation conference with each faculty member to review
                strengths, discuss growth areas, and sign the Annex D (FEDAF) development plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border bg-muted/30 py-8 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
              P
            </div>
            <div>
              <p className="font-semibold text-foreground">Palompon Institute of Technology</p>
              <p className="text-[11px]">Evangelista St., Palompon, Leyte 6538, Philippines</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-muted-foreground">Quality Assurance & Evaluation Office</span>
            <span>•</span>
            <Link
              to="/login"
              className="text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>Sign In</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 pt-4 border-t border-border/40 text-center text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Palompon Institute of Technology. All rights reserved.
          Designed in accordance with CHED CMO 19 s. 2025.
        </div>
      </footer>
    </div>
  );
}
