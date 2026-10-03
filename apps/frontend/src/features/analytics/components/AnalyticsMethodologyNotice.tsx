import { useState } from "react";
import { Info, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AnalyticsMethodologyNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-2xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-3.5 px-4 bg-muted/40 hover:bg-muted/60 transition cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>Evaluation Computation & Statistical Methodology</span>
              <Badge
                variant="outline"
                className="text-[10px] text-primary border-primary/30 font-normal"
              >
                CHED CMO 19 s. 2025
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Click to view how SET, SEF, and department-wide grade distributions are calculated.
            </p>
          </div>
        </div>

        <button type="button" className="text-muted-foreground p-1 hover:text-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="p-4 pt-3 border-t border-border/60 text-xs space-y-3 bg-background animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-2">
              <div>
                <span className="font-bold text-foreground block">
                  1. Program & College Consolidation:
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  The program and college rows represent the <strong>consolidated aggregate</strong>{" "}
                  of all faculty members who taught course offerings under that entity for the
                  selected semester. SET and SEF indices are the arithmetic mean of all evaluated
                  faculty members within that cohort.
                </p>
              </div>

              <div>
                <span className="font-bold text-foreground block">
                  2. Distinct SET and SEF Separation:
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Per <strong>CHED CMO 19 s. 2025 (Section 6.10 & 9.2)</strong>, Student Evaluation
                  of Teachers (SET) and Supervisor's Evaluation of Faculty (SEF) are recorded and
                  analyzed as <strong>separate pedagogical metrics</strong>. No arbitrary weight
                  ratio (e.g., 60/40) is applied, preserving the purity of both student classroom
                  feedback and supervisory verification.
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div>
                <span className="font-bold text-foreground block">
                  3. Perception Gap Index (Δ SEF − SET):
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Calculated as <code>SEF Rating − SET Rating</code>. A{" "}
                  <strong>positive gap (+)</strong> indicates the supervisor rated the faculty
                  higher than the students did, while a <strong>negative gap (−)</strong> indicates
                  students experienced classroom friction or difficulties not captured during
                  supervisory observations.
                </p>
              </div>

              <div>
                <span className="font-bold text-foreground block">
                  4. Qualitative Grade Scale Distribution:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-success/15 text-success font-bold">
                    O: Outstanding (4.50 – 5.00)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-info/15 text-info font-bold">
                    VS: Very Satisfactory (3.50 – 4.49)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                    S: Satisfactory (2.50 – 3.49)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-warning/15 text-warning font-bold">
                    F: Fair (1.50 – 2.49)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive font-bold">
                    P: Poor (&lt; 1.50)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              All student responses and individual class sizes are protected under strict respondent
              confidentiality guidelines.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
