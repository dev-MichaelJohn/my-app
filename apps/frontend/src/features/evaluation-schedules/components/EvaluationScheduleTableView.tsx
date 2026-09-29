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
import { format } from "date-fns";
import type { GetStudentSchedule, GetSupervisorSchedule } from "@my-app/shared";
import { getScheduleWindowStatus } from "@/lib/format.lib";

interface Props {
  schedules: (GetStudentSchedule | GetSupervisorSchedule)[];
  isArchivedView: boolean;
  onEdit: (schedule: GetStudentSchedule | GetSupervisorSchedule) => void;
  onDelete: (schedule: GetStudentSchedule | GetSupervisorSchedule) => void;
  onRestore: (schedule: GetStudentSchedule | GetSupervisorSchedule) => void;
  onForceStop: (schedule: GetStudentSchedule | GetSupervisorSchedule) => void;
}

export function EvaluationScheduleTableView({
  schedules,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
  onForceStop,
}: Props) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No evaluation schedules found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Open a new evaluation window for students or supervisors.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Evaluation Form</TableHead>
            <TableHead className="font-bold">Academic Semester</TableHead>
            <TableHead className="font-bold">Submission Window (Dates & Time)</TableHead>
            <TableHead className="w-[170px] font-bold">Status</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((item) => {
            const status = getScheduleWindowStatus(item.open_at, item.close_at);

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <p className="font-semibold text-foreground text-sm">
                    {item.form?.title ?? "Unknown Form"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Scale: {item.form?.min_rating ?? 1} – {item.form?.max_rating ?? 5}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-semibold text-xs text-primary border-primary/20"
                  >
                    {item.semester.semester_term} Sem ({item.semester.school_year_start}-
                    {item.semester.school_year_end})
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-medium">
                  {format(new Date(item.open_at), "MMM d, yyyy h:mm a")} &nbsp;—&nbsp;{" "}
                  {format(new Date(item.close_at), "MMM d, yyyy h:mm a")}
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
                      className="w-44 border-border bg-popover text-popover-foreground"
                    >
                      {!isArchivedView ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit Timeline</span>
                          </DropdownMenuItem>

                          {status.label === "Open for Submissions" && (
                            <DropdownMenuItem
                              onClick={() => onForceStop(item)}
                              className="gap-2 text-chart-2 focus:bg-chart-2/10 cursor-pointer font-medium"
                            >
                              <Square className="w-4 h-4" />
                              <span>Force Stop Period</span>
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
