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
  Users,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router";
import type { GetClass } from "@my-app/shared";

interface ClassTableViewProps {
  classes: GetClass[];
  isArchivedView: boolean;
  onEdit: (item: GetClass) => void;
  onDelete: (item: GetClass) => void;
  onRestore: (item: GetClass) => void;
}

export function ClassTableView({
  classes,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: ClassTableViewProps) {
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
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[140px] font-bold">Class Section</TableHead>
            <TableHead className="font-bold">Degree Program</TableHead>
            <TableHead className="font-bold">Year Level</TableHead>
            <TableHead className="font-bold">Section</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((item) => {
            const classLabel = `${item.program.initialism} ${item.year_level}-${item.section}`;

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-mono font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {classLabel}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">{item.program.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    Year {item.year_level}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded-md text-foreground">
                    Section {item.section}
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
                          {/* Quick Jump to Class Roster */}
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
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit Section</span>
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
