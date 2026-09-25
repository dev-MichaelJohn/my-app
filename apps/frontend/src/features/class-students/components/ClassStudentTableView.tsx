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
import type { GetClassStudent } from "@my-app/shared";

interface ClassStudentTableViewProps {
  roster: GetClassStudent[];
  isArchivedView: boolean;
  onEdit: (item: GetClassStudent) => void;
  onDelete: (item: GetClassStudent) => void;
  onRestore: (item: GetClassStudent) => void;
}

export function ClassStudentTableView({
  roster,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: ClassStudentTableViewProps) {
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
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Enrolled Student</TableHead>
            <TableHead className="font-bold">Institutional ID</TableHead>
            <TableHead className="w-[140px] font-bold">Class Section</TableHead>
            <TableHead className="font-bold">Academic Semester</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((item) => {
            const fullName = `${item.student.details.last_name}, ${item.student.details.first_name}`;
            const classLabel = `${item.class.program.initialism} ${item.class.year_level}-${item.class.section}`;

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
                  <Badge variant="secondary" className="font-mono font-bold text-xs">
                    {classLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-medium">
                  {item.semester.semester_term} Sem (A.Y. {item.semester.school_year_start}-
                  {item.semester.school_year_end})
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
                      className="w-44 border-border bg-popover text-popover-foreground"
                    >
                      {!isArchivedView ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit Section</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Unenroll Student</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onRestore(item)}
                          className="gap-2 text-primary focus:bg-primary/10 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Re-enroll Student</span>
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
