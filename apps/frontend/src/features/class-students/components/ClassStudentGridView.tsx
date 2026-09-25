import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import type { GetClassStudent } from "@my-app/shared";

interface ClassStudentGridViewProps {
  roster: GetClassStudent[];
  isArchivedView: boolean;
  onEdit: (item: GetClassStudent) => void;
  onDelete: (item: GetClassStudent) => void;
  onRestore: (item: GetClassStudent) => void;
}

export function ClassStudentGridView({
  roster,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: ClassStudentGridViewProps) {
  if (roster.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No students found on this class roster</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Enroll students into this class section to view them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((item) => {
        const fullName = `${item.student.details.last_name}, ${item.student.details.first_name}`;
        const classLabel = `${item.class.program.initialism} ${item.class.year_level}-${item.class.section}`;

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

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 border-border bg-popover">
                  {!isArchivedView ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => onEdit(item)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Section</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="gap-2 text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Unenroll Student</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onRestore(item)}
                      className="gap-2 text-primary cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-enroll Student</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {/* Cohort Details Box */}
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Assigned Class:</span>
                  <Badge variant="secondary" className="font-mono font-bold text-xs">
                    {classLabel}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-muted-foreground font-medium">Semester Term:</span>
                  <span className="font-semibold text-foreground">
                    {item.semester.semester_term} Sem ({item.semester.school_year_start}-
                    {item.semester.school_year_end})
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Enrollment ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Active Roster"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
