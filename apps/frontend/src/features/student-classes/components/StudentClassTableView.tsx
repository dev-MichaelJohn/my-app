import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, RotateCcw, ShieldAlert, Lock } from "lucide-react";
import type { GetStudentClass } from "@my-app/shared";

interface StudentClassTableViewProps {
  students: GetStudentClass[];
  isArchivedView: boolean;
  isConcluded: boolean;
  onDelete: (item: GetStudentClass) => void;
  onRestore: (item: GetStudentClass) => void;
}

export function StudentClassTableView({
  students,
  isArchivedView,
  isConcluded,
  onDelete,
  onRestore,
}: StudentClassTableViewProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No students enrolled in this offering</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add students or irregular cross-enrollees to this subject offering.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Student Name</TableHead>
            <TableHead className="font-bold">Institutional ID</TableHead>
            <TableHead className="font-bold">Course Subject</TableHead>
            <TableHead className="font-bold">Class Section</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((item) => {
            const fullName = `${item.student.details.last_name}, ${item.student.details.first_name}`;
            const classLabel = `${item.offering.class.program.initialism} ${item.offering.class.year_level}-${item.offering.class.section}`;

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {item.student.details.first_name[0]}
                      {item.student.details.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">
                        {fullName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.student.account.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono font-bold text-foreground">
                    {item.student.details.institutional_id}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-foreground text-sm">
                    {item.offering.course_curriculum.course.initialism}
                  </span>
                  <span className="text-xs text-muted-foreground block truncate max-w-[200px]">
                    {item.offering.course_curriculum.course.name}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono font-bold text-xs">
                    {classLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {isConcluded ? (
                    <span
                      className="text-xs text-muted-foreground flex items-center justify-end gap-1"
                      title="Term Concluded"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 border-border bg-popover text-popover-foreground"
                      >
                        {!isArchivedView ? (
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Unenroll</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => onRestore(item)}
                            className="gap-2 text-primary focus:bg-primary/10 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Re-enroll</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
