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
  ShieldAlert,
  BookOpen,
  Layers,
} from "lucide-react";
import type { GetCollege, GetProgram } from "@my-app/shared";
import { useNavigate } from "react-router";

interface ProgramTableViewProps {
  programs: GetProgram[];
  collegesMap: Map<number, GetCollege>;
  isArchivedView: boolean;
  onEdit: (program: GetProgram) => void;
  onDelete: (program: GetProgram) => void;
  onRestore: (program: GetProgram) => void;
}

export function ProgramTableView({
  programs,
  collegesMap,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: ProgramTableViewProps) {
  const navigate = useNavigate();

  if (programs.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No academic programs found</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[120px] font-bold">Code</TableHead>
            <TableHead className="font-bold">Program Name</TableHead>
            <TableHead className="font-bold">Parent College</TableHead>
            <TableHead className="font-bold">Program Chair</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((item) => {
            const college = collegesMap.get(item.program.college_id);

            return (
              <TableRow
                key={item.program.id}
                className="border-border hover:bg-muted/30 transition"
              >
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-mono font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {item.program.initialism}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">{item.program.name}</TableCell>
                <TableCell>
                  {college ? (
                    <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md text-foreground">
                      {college.college.initialism}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      ID: #{item.program.college_id}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {item.chair ? (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {item.chair.details.first_name} {item.chair.details.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.chair.account.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground/70 italic">
                      No Chair Assigned
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
                            onClick={() => navigate(`/admin/courses?program_id=${item.program.id}`)}
                            className="gap-2 cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span>View Courses</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/admin/curriculums?program_id=${item.program.id}`)
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <Layers className="w-4 h-4 text-primary" />
                            <span>View Curriculums</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span>Edit</span>
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
