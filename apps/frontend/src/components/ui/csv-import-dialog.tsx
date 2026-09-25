import { useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, Trash2 } from "lucide-react";
import { http, type ApiError } from "@/lib/api.lib";
import type { ImportSummary } from "@my-app/shared";

export type ImportEntityType = "colleges" | "programs" | "courses" | "curriculums" | "classes";

const SAMPLE_CSV_DATA: Record<ImportEntityType, string> = {
  colleges: `name,initialism,dean_institutional_id
College of Technology and Engineering,COTE,04-0204-20
College of Arts and Sciences,CAS,01-0101-20`,

  programs: `name,initialism,college_code,chair_institutional_id
Bachelor of Science in Information Technology,BSIT,COTE,04-0204-20
Bachelor of Science in Mechanical Engineering,BSME,COTE,
Bachelor of Arts in Philosophy,BAP,CAS,`,

  courses: `name,initialism,program_code
Data Structures and Algorithms,IT 102,BSIT
Object-Oriented Programming,IT 103,BSIT
Thermodynamics 1,ME 201,BSME`,

  curriculums: `program_code,course_code,year_level,semester_term
BSIT,IT 102,I,2nd
BSIT,IT 103,II,1st
BSME,ME 201,II,1st`,

  classes: `program_code,year_level,section
BSIT,I,A
BSIT,I,B
BSIT,II,A
BSME,I,A`,
};

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: ImportEntityType;
  entityTitle: string;
  onSuccess: () => void;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  entity,
  entityTitle,
  onSuccess,
}: CsvImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        {/* 🚀 Key remounts clean state naturally whenever the dialog opens/closes */}
        {open && (
          <CsvImportDialogContent
            key={open ? "open" : "closed"}
            entity={entity}
            entityTitle={entityTitle}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Inner Content (Discards state on unmount) ──
function CsvImportDialogContent({
  entity,
  entityTitle,
  onSuccess,
  onClose,
}: {
  entity: ImportEntityType;
  entityTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);

  // 1. Download Sample CSV
  const handleDownloadTemplate = () => {
    const csvContent = SAMPLE_CSV_DATA[entity];
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_${entity}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse & Preview CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    Papa.parse<string[]>(selectedFile, {
      preview: 5,
      complete: (results) => {
        setPreviewRows(results.data);
      },
    });
  };

  // Clear chosen file
  const handleClearFile = () => {
    setFile(null);
    setPreviewRows([]);
    setImportResult(null);
  };

  // 3. Upload to Backend
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await http.post<ImportSummary>(`/bulk-import/${entity}`, formData);

    setIsUploading(false);

    result.match(
      (summary) => {
        setImportResult(summary);
        if (summary.failed === 0) {
          toast.success(`Successfully imported ${summary.successful} ${entityTitle}.`);
          onSuccess();
          onClose(); // Auto-close on complete success
        } else {
          toast.warning(`Imported ${summary.successful} items with ${summary.failed} errors.`);
          onSuccess();
        }
      },
      (err: ApiError) => {
        toast.error(err.message || "Failed to process CSV import.");
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <span>Bulk Import {entityTitle} via CSV</span>
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Upload a CSV with human-readable initialisms and codes. No database IDs required.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Download Sample Banner */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border text-xs">
          <div>
            <p className="font-semibold text-foreground">Need the correct column format?</p>
            <p className="text-muted-foreground">Download our pre-formatted sample template.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-1.5 h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </Button>
        </div>

        {/* File Upload Dropzone */}
        {!file ? (
          <div className="border-2 border-dashed border-border hover:border-primary/50 transition p-6 rounded-xl text-center bg-muted/20 space-y-2">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
            <div>
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer font-semibold text-primary hover:underline text-sm"
              >
                Click to browse
              </label>
              <span className="text-xs text-muted-foreground"> or drag and drop your CSV here</span>
            </div>
            <p className="text-[11px] text-muted-foreground">UTF-8 encoded CSV files up to 5MB</p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          /* File Selected Card */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFile}
                className="h-8 text-destructive hover:bg-destructive/10 gap-1 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change</span>
              </Button>
            </div>

            {/* Top 5 Rows Preview */}
            {previewRows.length > 0 && (
              <div className="border border-border rounded-lg overflow-x-auto bg-muted/30 p-2 text-[11px] font-mono">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      {previewRows[0]?.map((col, idx) => (
                        <th key={idx} className="p-1 font-bold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-border/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1 truncate max-w-[140px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Error Summary Report */}
        {importResult && importResult.failed > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-destructive font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{importResult.failed} row(s) could not be imported:</span>
            </div>
            <ul className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-destructive/90 divide-y divide-destructive/10">
              {importResult.errors.map((err, idx) => (
                <li key={idx} className="pt-1">
                  <strong>
                    Row {err.row} ({err.identifier}):
                  </strong>{" "}
                  {err.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter className="pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isUploading}
          className="border-border text-foreground hover:bg-muted"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              <span>Processing CSV...</span>
            </div>
          ) : (
            "Start Import"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
