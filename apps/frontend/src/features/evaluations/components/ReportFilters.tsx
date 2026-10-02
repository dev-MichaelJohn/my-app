import { Search, LayoutGrid, List, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GetCollege, GetProgram, ISemesterSelect, ReportStatus } from "@my-app/shared";

interface Props {
  searchInput: string;
  onSearchChange: (val: string) => void;
  selectedSemesterId?: number;
  onSemesterChange: (val: number | undefined) => void;
  semesters: ISemesterSelect[];
  selectedCollegeId?: number;
  onCollegeChange: (val: number | undefined) => void;
  colleges: GetCollege[];
  selectedProgramId?: number;
  onProgramChange: (val: number | undefined) => void;
  availablePrograms: GetProgram[];
  selectedStatus?: ReportStatus | "ALL";
  onStatusChange: (val: ReportStatus | "ALL") => void;
  viewMode: "table" | "grid";
  onViewModeChange: (val: "table" | "grid") => void;
  paginate: boolean;
  onPaginateChange: (val: boolean) => void;
  limit: number;
  onLimitChange: (val: number) => void;

  // Office locks
  isDean?: boolean;
  isChair?: boolean;
  isPrivilegedAdmin?: boolean;
}

export function ReportFilters({
  searchInput,
  onSearchChange,
  selectedSemesterId,
  onSemesterChange,
  semesters,
  selectedCollegeId,
  onCollegeChange,
  colleges,
  selectedProgramId,
  onProgramChange,
  availablePrograms,
  selectedStatus = "ALL",
  onStatusChange,
  viewMode,
  onViewModeChange,
  paginate,
  onPaginateChange,
  limit,
  onLimitChange,
  isDean = false,
  isChair = false,
  isPrivilegedAdmin = false,
}: Props) {
  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);
  const currentCollege = colleges.find((c) => c.college.id === selectedCollegeId);
  const currentProgram = availablePrograms.find((p) => p.program.id === selectedProgramId);

  const lockCollege = isDean && !isPrivilegedAdmin;
  const lockProgram = isChair && !isPrivilegedAdmin;

  return (
    <div className="flex flex-col gap-3 p-3 bg-muted/30 border border-border rounded-2xl shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search faculty name..."
            className="pl-9 bg-card border-border text-xs h-9 shadow-2xs w-full"
          />
        </div>

        {/* Semester Selector */}
        <Select
          value={selectedSemesterId ? String(selectedSemesterId) : "all"}
          onValueChange={(val) => onSemesterChange(val === "all" ? undefined : Number(val))}
        >
          <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
            <SelectValue placeholder="All Semesters">
              {currentSemester ? (
                <span className="truncate block text-left">
                  <strong className="text-primary mr-1">{currentSemester.semester_term} Sem</strong>
                  <span className="text-muted-foreground">
                    ({currentSemester.school_year_start}-{currentSemester.school_year_end})
                  </span>
                </span>
              ) : (
                "All Semesters"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-xs max-w-sm">
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* College Selector (Locked for Deans) */}
        <Select
          value={selectedCollegeId ? String(selectedCollegeId) : "all"}
          disabled={lockCollege}
          onValueChange={(val) => {
            const nextColId = val === "all" ? undefined : Number(val);
            onCollegeChange(nextColId);
          }}
        >
          <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
            <SelectValue placeholder="All Colleges">
              {currentCollege ? (
                <span className="truncate block text-left font-medium">
                  {lockCollege && <Lock className="w-3 h-3 inline mr-1 text-muted-foreground" />}
                  <strong className="font-mono text-primary mr-1">
                    {currentCollege.college.initialism}
                  </strong>
                  <span className="text-muted-foreground">({currentCollege.college.name})</span>
                </span>
              ) : (
                "All Colleges"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-xs max-w-sm">
            {!lockCollege && <SelectItem value="all">All Colleges</SelectItem>}
            {colleges.map((c) => (
              <SelectItem key={c.college.id} value={String(c.college.id)}>
                <span className="font-mono font-bold text-primary mr-1.5">
                  {c.college.initialism}
                </span>
                - {c.college.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Program Selector (Locked for Chairs) */}
        <Select
          value={selectedProgramId ? String(selectedProgramId) : "all"}
          disabled={lockProgram}
          onValueChange={(val) => onProgramChange(val === "all" ? undefined : Number(val))}
        >
          <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
            <SelectValue placeholder="All Programs">
              {currentProgram ? (
                <span className="truncate block text-left font-medium">
                  {lockProgram && <Lock className="w-3 h-3 inline mr-1 text-muted-foreground" />}
                  <strong className="font-mono text-primary mr-1">
                    {currentProgram.program.initialism}
                  </strong>
                  <span className="text-muted-foreground">({currentProgram.program.name})</span>
                </span>
              ) : (
                "All Programs"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-xs max-w-sm">
            {!lockProgram && <SelectItem value="all">All Programs</SelectItem>}
            {availablePrograms.map((p) => (
              <SelectItem key={p.program.id} value={String(p.program.id)}>
                <span className="font-mono font-bold text-primary mr-1.5">
                  {p.program.initialism}
                </span>
                - {p.program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Status tabs & View Modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
        <Tabs
          value={selectedStatus}
          onValueChange={(val) => onStatusChange(val as ReportStatus | "ALL")}
        >
          <TabsList className="bg-muted border border-border h-8 p-0.5">
            <TabsTrigger value="ALL" className="text-xs px-3 h-7">
              All Statuses
            </TabsTrigger>
            <TabsTrigger value="DRAFT" className="text-xs px-3 h-7">
              Draft
            </TabsTrigger>
            <TabsTrigger value="FINALIZED" className="text-xs px-3 h-7">
              Finalized
            </TabsTrigger>
            <TabsTrigger value="PUBLISHED" className="text-xs px-3 h-7">
              Published
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 border border-border rounded-lg bg-card h-8 shadow-2xs">
            <Switch
              id="report-paginate-switch"
              checked={paginate}
              onCheckedChange={onPaginateChange}
            />
            <Label
              htmlFor="report-paginate-switch"
              className="text-xs font-medium cursor-pointer select-none text-foreground"
            >
              Pagination
            </Label>
          </div>

          {paginate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Per page:</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onLimitChange(val > 0 ? Math.min(val, 100) : 10);
                }}
                className="w-14 h-8 text-xs bg-card border-border text-center font-medium shadow-2xs"
              />
            </div>
          )}

          <div className="flex items-center border border-border rounded-lg bg-muted p-0.5 h-8">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => onViewModeChange("grid")}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => onViewModeChange("table")}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
