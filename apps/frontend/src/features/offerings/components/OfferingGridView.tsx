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
import {
  MoreVertical,
  Edit,
  Trash2,
  RotateCcw,
  CalendarDays,
  UserCheck,
  UserX,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { GetOffering } from "@my-app/shared";
import { useNavigate } from "react-router";

interface OfferingGridViewProps {
  offerings: GetOffering[];
  isArchivedView: boolean;
  onEdit: (item: GetOffering) => void;
  onDelete: (item: GetOffering) => void;
  onRestore: (item: GetOffering) => void;
}

export function OfferingGridView({
  offerings,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: OfferingGridViewProps) {
  const navigate = useNavigate();

  if (offerings.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No course offerings found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Try generating offerings for this semester or adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {offerings.map((item) => {
        const classLabel = `${item.class.program.initialism} ${item.class.year_level}-${item.class.section}`;

        return (
          <Card
            key={item.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="font-mono font-bold text-primary border-primary/20"
                >
                  {item.course_curriculum.course.initialism}
                </Badge>
                <Badge variant="secondary" className="font-mono font-bold text-xs">
                  {classLabel}
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
                        onClick={() =>
                          navigate(`/admin/student-classes?course_offering_id=${item.id}`)
                        }
                        className="gap-2 cursor-pointer font-medium text-primary focus:bg-primary/10"
                      >
                        <Users className="w-4 h-4 text-primary" />
                        <span>Enrolled Students</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onEdit(item)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Assign / Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="gap-2 text-destructive cursor-pointer"
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
              <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                {item.course_curriculum.course.name}
              </h3>

              {/* Faculty Assignment Box */}
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Faculty Instructor
                </p>
                {item.faculty ? (
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-foreground truncate">
                        {item.faculty.details.first_name} {item.faculty.details.last_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.faculty.account.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs font-semibold text-chart-2 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" /> Unassigned
                    </span>
                    {!isArchivedView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-6 text-[11px] text-primary px-2 hover:bg-primary/10"
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {!isArchivedView && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/student-classes?course_offering_id=${item.id}`)}
                    className="w-full text-xs gap-2 h-8 border-border bg-card hover:bg-muted text-foreground"
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Enrolled Students</span>
                  </Button>
                </>
              )}
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Offering ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Active"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
