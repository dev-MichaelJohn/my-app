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
import { MoreVertical, Edit, Trash2, RotateCcw, Calendar, ShieldAlert, Square } from "lucide-react";
import { getSemesterStatus } from "@/lib/format.lib";
import type { ISemesterSelect } from "@my-app/shared";

interface SemesterGridViewProps {
  semesters: ISemesterSelect[];
  isArchivedView: boolean;
  onEdit: (semester: ISemesterSelect) => void;
  onDelete: (semester: ISemesterSelect) => void;
  onRestore: (semester: ISemesterSelect) => void;
  onForceStop: (semester: ISemesterSelect) => void;
}

export function SemesterGridView({
  semesters,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
  onForceStop,
}: SemesterGridViewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {semesters.map((item) => {
        const status = getSemesterStatus(item.start_date, item.end_date);

        return (
          <Card
            key={item.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="font-mono font-bold text-primary border-primary/20"
                >
                  {item.semester_term} Semester
                </Badge>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 border-border bg-popover">
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
                      className="gap-2 text-primary cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">
                  A.Y. {item.school_year_start}-{item.school_year_end}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.color}`}
                >
                  {status.label}
                </span>
              </div>

              {/* Timeline Box */}
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Academic Timeline
                </p>
                <p className="font-semibold text-foreground">
                  {item.start_date} &nbsp;—&nbsp; {item.end_date}
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Semester ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Active"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
