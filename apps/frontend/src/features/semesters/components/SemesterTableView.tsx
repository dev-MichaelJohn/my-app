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
import { MoreHorizontal, Edit, Trash2, RotateCcw, ShieldAlert, Square } from "lucide-react";
import type { ISemesterSelect } from "@my-app/shared";
import { getSemesterStatus } from "@/lib/format.lib";

interface SemesterTableViewProps {
  semesters: ISemesterSelect[];
  isArchivedView: boolean;
  onEdit: (semester: ISemesterSelect) => void;
  onDelete: (semester: ISemesterSelect) => void;
  onRestore: (semester: ISemesterSelect) => void;
  onForceStop: (semester: ISemesterSelect) => void;
}

export function SemesterTableView({
  semesters,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
  onForceStop,
}: SemesterTableViewProps) {
  if (semesters.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No academic semesters found</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Academic Year & Term</TableHead>
            <TableHead className="font-bold">Date Duration</TableHead>
            <TableHead className="w-[120px] font-bold">Status</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {semesters.map((item) => {
            const status = getSemesterStatus(item.start_date, item.end_date);

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono font-bold text-primary border-primary/20"
                    >
                      {item.semester_term} Semester
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">
                      A.Y. {item.school_year_start}-{item.school_year_end}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-medium">
                  {item.start_date} &nbsp;—&nbsp; {item.end_date}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${status.color}`}
                  >
                    {status.label}
                  </span>
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
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit</span>
                          </DropdownMenuItem>

                          {status.label === "Ongoing" && (
                            <DropdownMenuItem
                              onClick={() => onForceStop(item)}
                              className="gap-2 text-chart-2 focus:bg-chart-2/10 cursor-pointer font-medium"
                            >
                              <Square className="w-4 h-4" />
                              <span>Force Stop Term</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Archive</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onRestore(item)}
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
