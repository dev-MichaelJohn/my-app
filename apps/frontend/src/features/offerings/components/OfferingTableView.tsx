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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  RotateCcw,
  UserCheck,
  UserX,
  ShieldAlert,
} from "lucide-react";
import type { GetOffering } from "@my-app/shared";

interface OfferingTableViewProps {
  offerings: GetOffering[];
  isArchivedView: boolean;
  onEdit: (item: GetOffering) => void;
  onDelete: (item: GetOffering) => void;
  onRestore: (item: GetOffering) => void;
}

export function OfferingTableView({
  offerings,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: OfferingTableViewProps) {
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
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[120px] font-bold">Course Code</TableHead>
            <TableHead className="font-bold">Course Title</TableHead>
            <TableHead className="w-[130px] font-bold">Class Section</TableHead>
            <TableHead className="font-bold">Assigned Instructor</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offerings.map((item) => {
            const classLabel = `${item.class.program.initialism} ${item.class.year_level}-${item.class.section}`;

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-mono font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {item.course_curriculum.course.initialism}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {item.course_curriculum.course.name}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono font-semibold text-xs">
                    {classLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.faculty ? (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {item.faculty.details.first_name} {item.faculty.details.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.faculty.account.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-chart-2/10 text-chart-2 border border-chart-2/20">
                      <UserX className="w-3 h-3" />
                      <span>Unassigned</span>
                    </span>
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
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Assign / Edit</span>
                          </DropdownMenuItem>
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
