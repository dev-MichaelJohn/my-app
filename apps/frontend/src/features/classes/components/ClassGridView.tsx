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
  School,
  Users,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router";
import type { GetClass } from "@my-app/shared";

interface ClassGridViewProps {
  classes: GetClass[];
  isArchivedView: boolean;
  onEdit: (item: GetClass) => void;
  onDelete: (item: GetClass) => void;
  onRestore: (item: GetClass) => void;
}

export function ClassGridView({
  classes,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: ClassGridViewProps) {
  const navigate = useNavigate();

  if (classes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No academic classes found</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((item) => {
        const classLabel = `${item.program.initialism} ${item.year_level}-${item.section}`;

        return (
          <Card
            key={item.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <School className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="font-mono font-bold text-primary border-primary/20 text-sm"
                >
                  {classLabel}
                </Badge>
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
                        onClick={() => navigate(`/admin/offerings?class_id=${item.id}`)}
                        className="gap-2 cursor-pointer"
                      >
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span>View Offerings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/rosters?class_id=${item.id}`)}
                        className="gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-primary" />
                        <span>View Roster</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onEdit(item)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
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
                {item.program.name}
              </h3>

              {/* Class Info Box */}
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Year Level {item.year_level}</span>
                <span className="text-muted-foreground font-medium">Section {item.section}</span>
              </div>

              {!isArchivedView && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/offerings?class_id=${item.id}`)}
                    className="w-full text-xs gap-2 h-8 border-border bg-card hover:bg-muted text-foreground"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span>View Offerings</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/rosters?class_id=${item.id}`)}
                    className="w-full text-xs gap-2 h-8 border-border bg-card hover:bg-muted text-foreground"
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>View Class Roster</span>
                  </Button>
                </>
              )}
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Class ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Active"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
