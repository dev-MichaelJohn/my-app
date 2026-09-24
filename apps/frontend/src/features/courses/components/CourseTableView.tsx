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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import type { GetProgram, ICourseSelect } from "@my-app/shared";

interface CourseTableViewProps {
  courses: ICourseSelect[];
  programsMap: Map<number, GetProgram>;
  isArchivedView: boolean;
  onEdit: (course: ICourseSelect) => void;
  onDelete: (course: ICourseSelect) => void;
  onRestore: (course: ICourseSelect) => void;
}

export function CourseTableView({
  courses,
  programsMap,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: CourseTableViewProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No courses found</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[130px] font-bold">Course Code</TableHead>
            <TableHead className="font-bold">Course Title</TableHead>
            <TableHead className="font-bold">Academic Program</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => {
            const program = programsMap.get(course.program_id);

            return (
              <TableRow key={course.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-mono font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {course.initialism}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">{course.name}</TableCell>
                <TableCell>
                  {program ? (
                    <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md text-foreground">
                      {program.program.initialism} - {program.program.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">ID: #{course.program_id}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 border-border bg-popover text-popover-foreground"
                    >
                      {!isArchivedView ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEdit(course)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            onClick={() => onDelete(course)}
                            className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Archive</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onRestore(course)}
                          className="gap-2 text-primary focus:bg-primary/10 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
