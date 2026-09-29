import { useState } from "react";
import { useFacultyTeachingOfferings } from "../hooks/useEvaluationSubmissions";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { BookOpen, Users, CheckCircle2, Clock, Search, Lock } from "lucide-react";
import type { FacultyTeachingOffering } from "@my-app/shared";

export default function FacultyTeachingPage() {
  const { data: activeSemester } = useActiveSemester();
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = semestersResponse?.data ?? [];

  const [selectedSemesterId, setSelectedSemesterId] = useState<number | undefined>(undefined);
  const currentSemesterId = selectedSemesterId ?? activeSemester?.id;

  const selectedSemester = semestersList.find((s) => s.id === currentSemesterId);

  const { data: offerings, isLoading } = useFacultyTeachingOfferings(currentSemesterId);

  const [activeOfferingDetails, setActiveOfferingDetails] =
    useState<FacultyTeachingOffering | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const filteredStudents = (activeOfferingDetails?.students ?? []).filter((s) => {
    const term = studentSearch.toLowerCase();
    const fullName = `${s.last_name}, ${s.first_name}`.toLowerCase();
    return fullName.includes(term) || s.institutional_id.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Teaching Classes & Evaluation Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your class rosters and track which students have submitted faculty evaluations
            (SET).
          </p>
        </div>

        {/* Semester Selector */}
        <div className="w-full sm:w-64">
          <Select
            value={currentSemesterId ? String(currentSemesterId) : ""}
            onValueChange={(val) => setSelectedSemesterId(Number(val))}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9">
              <SelectValue placeholder="Select Semester">
                {selectedSemester ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {selectedSemester.semester_term} Sem
                    </strong>
                    <span className="text-muted-foreground">
                      (A.Y. {selectedSemester.school_year_start}-{selectedSemester.school_year_end})
                    </span>
                  </span>
                ) : (
                  "Select Semester"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              {semestersList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <span className="font-bold text-primary mr-1.5">{s.semester_term} Sem</span>
                  <span className="text-muted-foreground">
                    (A.Y. {s.school_year_start}-{s.school_year_end})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Offerings Grid */}
      {isLoading ? (
        <div className="py-16 flex justify-center items-center">
          <Spinner size="lg" />
        </div>
      ) : !offerings || offerings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground text-lg">No Teaching Assignments Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            You are currently not assigned as the instructor for any course offerings in this
            semester.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map((item) => {
            const classLabel = `${item.offering.class.program.initialism} ${item.offering.class.year_level}-${item.offering.class.section}`;

            return (
              <Card
                key={item.offering.id}
                className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono font-bold text-primary border-primary/20"
                    >
                      {item.offering.course_curriculum.course.initialism}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {classLabel}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    #{item.offering.id}
                  </span>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <div>
                    <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                      {item.offering.course_curriculum.course.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.offering.class.program.name}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-muted-foreground">
                        Evaluation Submissions
                      </span>
                      <span className="font-bold text-foreground">
                        {item.total_evaluated} / {item.total_students} ({item.completion_rate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${item.completion_rate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveOfferingDetails(item);
                      setStudentSearch("");
                    }}
                    className="w-full text-xs gap-1.5 h-8 border-border bg-card hover:bg-muted"
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>View Student Roster ({item.total_students})</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Student List & Evaluation Status Modal */}
      {activeOfferingDetails && (
        <Dialog
          open={Boolean(activeOfferingDetails)}
          onOpenChange={(open) => !open && setActiveOfferingDetails(null)}
        >
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-primary" />
                <span>
                  {activeOfferingDetails.offering.course_curriculum.course.initialism} — Roster
                  Evaluation Status
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {activeOfferingDetails.offering.class.program.initialism}{" "}
                {activeOfferingDetails.offering.class.year_level}-
                {activeOfferingDetails.offering.class.section} •{" "}
                {activeOfferingDetails.total_evaluated} of {activeOfferingDetails.total_students}{" "}
                students evaluated ({activeOfferingDetails.completion_rate}%)
              </DialogDescription>
            </DialogHeader>

            {/* Privacy notice banner */}
            <div className="p-3 bg-muted/60 border border-border rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Confidential Evaluation:</strong> To protect student privacy, only
                submission status is shown. Individual scores, ratings, and feedback comments remain
                strictly anonymous.
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search enrolled student..."
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            {/* Students Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Student Name</TableHead>
                    <TableHead className="text-xs font-bold">ID Number</TableHead>
                    <TableHead className="text-xs font-bold text-right">
                      Evaluation Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        No matching students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((s) => (
                      <TableRow key={s.student_account_id}>
                        <TableCell className="text-xs font-medium text-foreground">
                          {s.last_name}, {s.first_name} {s.suffix ?? ""}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {s.institutional_id}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.has_evaluated ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Submitted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground text-[10px] gap-1"
                            >
                              <Clock className="w-3 h-3 opacity-60" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
