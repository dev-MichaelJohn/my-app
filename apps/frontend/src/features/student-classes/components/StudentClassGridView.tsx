import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, RotateCcw, Lock, ShieldAlert } from "lucide-react";
import type { GetStudentClass } from "@my-app/shared";

interface StudentClassGridViewProps {
  students: GetStudentClass[];
  isArchivedView: boolean;
  isConcluded: boolean;
  onDelete: (item: GetStudentClass) => void;
  onRestore: (item: GetStudentClass) => void;
}

export function StudentClassGridView({
  students,
  isArchivedView,
  isConcluded,
  onDelete,
  onRestore,
}: StudentClassGridViewProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No students enrolled in this offering</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Enroll regular or irregular students to view them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((item) => {
        const fullName = `${item.student.details.last_name}, ${item.student.details.first_name}`;
        const classLabel = `${item.offering.class.program.initialism} ${item.offering.class.year_level}-${item.offering.class.section}`;

        return (
          <Card
            key={item.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {item.student.details.first_name[0]}
                  {item.student.details.last_name[0]}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm text-foreground truncate">{fullName}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.student.details.institutional_id}
                  </p>
                </div>
              </div>

              {isConcluded ? (
                <span className="text-xs text-muted-foreground p-1" title="Term Concluded">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 border-border bg-popover">
                    {!isArchivedView ? (
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="gap-2 text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Unenroll</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onRestore(item)}
                        className="gap-2 text-primary cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Re-enroll</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>

            <CardContent className="space-y-2.5 pt-1">
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Subject:</span>
                  <span className="font-bold text-foreground truncate max-w-[170px]">
                    {item.offering.course_curriculum.course.initialism}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-muted-foreground font-medium">Section:</span>
                  <Badge variant="secondary" className="font-mono font-bold text-[11px]">
                    {classLabel}
                  </Badge>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Enrollment ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Enrolled"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
