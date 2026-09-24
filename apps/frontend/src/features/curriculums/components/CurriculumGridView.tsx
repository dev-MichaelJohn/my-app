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
import { MoreVertical, Edit, Trash2, RotateCcw, Layers, ShieldAlert } from "lucide-react";
import type { GetCurriculum } from "@my-app/shared";

interface CurriculumGridViewProps {
  curriculums: GetCurriculum[];
  isArchivedView: boolean;
  onEdit: (curriculum: GetCurriculum) => void;
  onDelete: (curriculum: GetCurriculum) => void;
  onRestore: (curriculum: GetCurriculum) => void;
}

export function CurriculumGridView({
  curriculums,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: CurriculumGridViewProps) {
  if (curriculums.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No curriculum mappings found</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {curriculums.map((item) => (
        <Card
          key={item.id}
          className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <Badge
                variant="outline"
                className="font-mono font-bold text-primary border-primary/20"
              >
                {item.course.initialism}
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                {item.program.initialism}
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
                    <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2 cursor-pointer">
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
              {item.course.name}
            </h3>

            {/* Academic Slot Badge */}
            <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Year Level {item.year_level}</span>
              <span className="text-muted-foreground font-medium">
                {item.semester_term} Semester
              </span>
            </div>
          </CardContent>

          <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
            <span>Mapping ID: #{item.id}</span>
            <span>{isArchivedView ? "Archived" : "Active"}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
