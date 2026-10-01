import type { AnnexCFacultyReport } from "@my-app/shared";

/**
 * Dispatches an HTML document to the browser's native print engine using a sandboxed iframe.
 * Completely replaces deprecated document.write and avoids browser popup blockers.
 */
function printViaIframe(htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  iframe.srcdoc = htmlContent;
}

/**
 * Downloads / Prints official Annex C (IFER) matching CHED CMO 19 s. 2025 page 17-18.
 * Notice: Course Code and Section are masked as Subject # and Class # for all roles.
 */
export function downloadAnnexCPdf(report: AnnexCFacultyReport) {
  const classRows = report.class_breakdown
    .map(
      (r) => `
      <tr>
        <td style="text-align: center;">${r.seq}</td>
        <td>${r.courseCode}</td>
        <td>${r.yearSection}</td>
        <td style="text-align: center;">${r.noOfStudents}</td>
        <td style="text-align: right;">${r.averageSetRating.toFixed(2)}</td>
        <td style="text-align: right;">${r.weightedScore.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>`,
    )
    .join("");

  const studentComments = report.student_comments
    .map(
      (c, i) =>
        `<tr><td style="width: 40px; text-align: center;">${i + 1}</td><td>"${c.comment}" <em>(${c.sentiment})</em></td></tr>`,
    )
    .join("");

  const supervisorComments = report.supervisor_comments
    .map(
      (s, i) =>
        `<tr><td style="width: 40px; text-align: center;">${i + 1}</td><td>${s.comment} <br/><small style="color: #666;">— ${s.evaluator_name} (${s.evaluator_role})</small></td></tr>`,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Annex C - ${report.faculty_name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.4; margin: 0; padding: 10px; }
          .header-box { text-align: center; margin-bottom: 20px; }
          .annex-badge { text-align: right; font-weight: bold; font-size: 9pt; margin-bottom: 10px; }
          h2 { margin: 4px 0; font-size: 14pt; letter-spacing: 0.5px; text-transform: uppercase; }
          .sub { font-size: 9pt; color: #555; }
          .section-title { font-weight: bold; font-size: 10.5pt; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 9.5pt; }
          th { background-color: #f2f2f2; text-align: left; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fafafa; border: 1px solid #ccc; padding: 10px; font-size: 9.5pt; }
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; text-align: center; font-size: 9pt; }
          .sign-line { border-bottom: 1px solid #333; height: 35px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="annex-badge">ANNEX C — Individual Faculty Evaluation Report</div>
        <div class="header-box">
          <h2>INDIVIDUAL FACULTY EVALUATION REPORT</h2>
          <div class="sub">Palompon Institute of Technology — Quality Assurance & Faculty Evaluation Office</div>
        </div>

        <div class="section-title">A. Faculty Information</div>
        <div class="info-grid">
          <div><strong>Name of Faculty Evaluated:</strong> ${report.faculty_name}</div>
          <div><strong>Department / College:</strong> ${report.department_college}</div>
          <div><strong>Current Faculty Rank:</strong> ${report.faculty_rank}</div>
          <div><strong>Semester / Term & A.Y.:</strong> ${report.semester_term} / ${report.school_year}</div>
        </div>

        <div class="section-title">B. Summary of Average SET Rating</div>
        <p style="font-size: 8.5pt; color: #555; margin: 0 0 4px 0;">
          Confidentiality Notice: Course titles and sections are masked in accordance with Section 6.10 of CHED CMO 19 s. 2025.
        </p>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">Seq</th>
              <th>(1) Course Code</th>
              <th>(2) Year / Section</th>
              <th style="text-align: center;">(3) No. of Students</th>
              <th style="text-align: right;">(4) Average SET Rating</th>
              <th style="text-align: right;">(3 × 4) Weighted SET Score</th>
            </tr>
          </thead>
          <tbody>
            ${classRows}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="3" style="text-align: center;">TOTAL</td>
              <td style="text-align: center;">${report.total_students_evaluated}</td>
              <td style="text-align: center;">TOTAL</td>
              <td style="text-align: right;">${report.total_weighted_score.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">C. SET and SEF Ratings</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50%;"></th>
              <th style="text-align: center;">SET Rating (Students)</th>
              <th style="text-align: center;">*SEF Rating (Supervisor)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: bold; font-size: 11pt;">
              <td>OVERALL RATING</td>
              <td style="text-align: center; color: #0284c7;">${report.overall_set_rating.toFixed(2)}</td>
              <td style="text-align: center; color: #059669;">${report.overall_sef_rating !== null ? report.overall_sef_rating.toFixed(2) : "N/A"}</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 8pt; color: #666; margin-top: -10px;">
          *Note: Rating given by the supervisor using the SEF instrument (no weighted ratio applied per CMO 19 s. 2025).
        </p>

        <div class="section-title">D. Summary of Qualitative Comments and Suggestions</div>
        <p style="font-size: 8.5pt; font-weight: bold; margin: 4px 0;">Top Representative Student Feedback:</p>
        <table><tbody>${studentComments || "<tr><td>No comments provided.</td></tr>"}</tbody></table>

        <p style="font-size: 8.5pt; font-weight: bold; margin: 4px 0;">Supervisor Comments & Suggestions:</p>
        <table><tbody>${supervisorComments || "<tr><td>No supervisor comments provided.</td></tr>"}</tbody></table>

        <div class="sign-grid">
          <div><div class="sign-line"></div>Prepared by (Staff)</div>
          <div><div class="sign-line"></div>Reviewed by (Authorized Official)</div>
        </div>
      </body>
    </html>
  `;

  printViaIframe(html);
}

/**
 * Downloads / Prints official Annex D (FEDAF) matching CHED CMO 19 s. 2025 page 19.
 */
export function downloadAnnexDPdf(report: AnnexCFacultyReport) {
  const plan = report.fedaf_plan || {
    areas_for_improvement: "",
    proposed_activities: "",
    action_plan: "",
    supervisor_name: "",
    supervisor_signed_at: null,
    faculty_signed_at: null,
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Annex D - ${report.faculty_name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.4; margin: 0; padding: 10px; }
          .header-box { text-align: center; margin-bottom: 20px; }
          .annex-badge { text-align: right; font-weight: bold; font-size: 9pt; margin-bottom: 10px; }
          h2 { margin: 4px 0; font-size: 13.5pt; letter-spacing: 0.5px; text-transform: uppercase; }
          .sub { font-size: 9pt; color: #555; }
          .section-title { font-weight: bold; font-size: 10.5pt; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 9.5pt; }
          th { background-color: #f2f2f2; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fafafa; border: 1px solid #ccc; padding: 10px; font-size: 9.5pt; }
          .plan-box { border: 1px solid #333; padding: 10px; margin-bottom: 12px; font-size: 9.5pt; min-height: 50px; }
          .plan-label { font-weight: bold; text-transform: uppercase; font-size: 8.5pt; color: #333; margin-bottom: 4px; }
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; font-size: 9pt; }
          .sign-card { border: 1px solid #999; padding: 10px; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="annex-badge">ANNEX D — Faculty Evaluation & Development Acknowledgment Form</div>
        <div class="header-box">
          <h2>FACULTY EVALUATION AND DEVELOPMENT ACKNOWLEDGMENT FORM (FEDAF)</h2>
          <div class="sub">Palompon Institute of Technology — Quality Assurance & Faculty Evaluation Office</div>
        </div>

        <div class="section-title">A. Faculty Member Information</div>
        <div class="info-grid">
          <div><strong>Name of Faculty:</strong> ${report.faculty_name}</div>
          <div><strong>Department / College:</strong> ${report.department_college}</div>
          <div><strong>Current Faculty Rank:</strong> ${report.faculty_rank}</div>
          <div><strong>Semester / Term & Year:</strong> ${report.semester_term} / ${report.school_year}</div>
        </div>

        <div class="section-title">B. Faculty Evaluation Summary</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50%; text-align: center;">Student Evaluation of Teachers (SET) Overall</th>
              <th style="width: 50%; text-align: center;">Supervisor's Evaluation of Faculty (SEF) Overall</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align: center; font-size: 12pt; font-weight: bold;">
              <td>${report.overall_set_rating.toFixed(2)}</td>
              <td>${report.overall_sef_rating !== null ? report.overall_sef_rating.toFixed(2) : "N/A"}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">C. Development Plan (Jointly Accomplished by Supervisor and Faculty)</div>
        <div class="plan-box">
          <div class="plan-label">1. Areas for Improvement:</div>
          <div>${plan.areas_for_improvement || "None identified."}</div>
        </div>
        <div class="plan-box">
          <div class="plan-label">2. Proposed Learning and Development Activities:</div>
          <div>${plan.proposed_activities || "None proposed."}</div>
        </div>
        <div class="plan-box">
          <div class="plan-label">3. Action Plan & Timelines:</div>
          <div>${plan.action_plan || "None outlined."}</div>
        </div>

        <p style="font-size: 8.5pt; color: #444; font-style: italic; margin-top: 14px;">
          "I acknowledge that I have received and reviewed the faculty evaluation conducted for the period mentioned above. I understand that my signature below does not necessarily indicate agreement with the evaluation but confirms that I have been given the opportunity to discuss it with my supervisor."
        </p>

        <div class="sign-grid">
          <div class="sign-card">
            <strong>SUPERVISOR</strong>
            <p style="margin: 6px 0 2px 0;">Name: ${plan.supervisor_name || "—"}</p>
            <p style="margin: 0; color: #666; font-size: 8pt;">Date Signed: ${plan.supervisor_signed_at ? new Date(plan.supervisor_signed_at).toLocaleDateString() : "Pending"}</p>
          </div>
          <div class="sign-card">
            <strong>FACULTY MEMBER</strong>
            <p style="margin: 6px 0 2px 0;">Name: ${report.faculty_name}</p>
            <p style="margin: 0; color: #666; font-size: 8pt;">Date Signed: ${plan.faculty_signed_at ? new Date(plan.faculty_signed_at).toLocaleDateString() : "Pending"}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  printViaIframe(html);
}
