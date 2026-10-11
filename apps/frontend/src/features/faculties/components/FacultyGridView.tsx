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
import { PERMISSIONS, type GetFaculty } from "@my-app/shared";
import { Can } from "@/components/Can";

interface Props {
  faculties: GetFaculty[];
  isArchivedView: boolean;
  onEdit: (item: GetFaculty) => void;
  onDelete: (item: GetFaculty) => void;
  onRestore: (item: GetFaculty) => void;
}

export function FacultyGridView({ faculties, isArchivedView, onEdit, onDelete, onRestore }: Props) {
  if (faculties.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No faculty members found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Appoint instructors to an academic program to view them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {faculties.map((item) => {
        const fullName = `${item.user.details.last_name}, ${item.user.details.first_name}${
          item.user.details.suffix ? ` ${item.user.details.suffix}` : ""
        }`;

        return (
          <Card
            key={item.id}
            className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {item.user.details.first_name[0]}
                  {item.user.details.last_name[0]}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm text-foreground truncate">{fullName}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.user.details.institutional_id}
                  </p>
                </div>
              </div>

              <Can anyPermission={[PERMISSIONS.FACULTY_CREATE, PERMISSIONS.FACULTY_UPDATE]}>
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
                          <span>Transfer Dept</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => onDelete(item)}
                          className="gap-2 text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
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
              </Can>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Home Department
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="font-mono font-bold text-primary text-xs">
                    {item.program.initialism}
                  </Badge>
                  <span className="font-semibold text-foreground truncate">
                    {item.program.name}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
              <span>Appointment ID: #{item.id}</span>
              <span>{isArchivedView ? "Archived" : "Active"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
