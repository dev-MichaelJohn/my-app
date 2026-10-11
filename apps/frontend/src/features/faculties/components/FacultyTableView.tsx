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
import { MoreHorizontal, Edit, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import { PERMISSIONS, type GetFaculty } from "@my-app/shared";
import { Can } from "@/components/Can";

interface Props {
  faculties: GetFaculty[];
  isArchivedView: boolean;
  onEdit: (item: GetFaculty) => void;
  onDelete: (item: GetFaculty) => void;
  onRestore: (item: GetFaculty) => void;
}

export function FacultyTableView({
  faculties,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: Props) {
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
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Faculty Member</TableHead>
            <TableHead className="font-bold">Institutional ID</TableHead>
            <TableHead className="font-bold">Home Academic Program</TableHead>
            <TableHead className="font-bold">Date Appointed</TableHead>
            <Can anyPermission={[PERMISSIONS.FACULTY_CREATE, PERMISSIONS.FACULTY_UPDATE]}>
              <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
            </Can>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faculties.map((item) => {
            const fullName = `${item.user.details.last_name}, ${item.user.details.first_name}${
              item.user.details.suffix ? ` ${item.user.details.suffix}` : ""
            }`;

            return (
              <TableRow key={item.id} className="border-border hover:bg-muted/30 transition">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {item.user.details.first_name[0]}
                      {item.user.details.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">
                        {fullName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.user.account.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono font-bold text-foreground">
                    {item.user.details.institutional_id}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="font-mono font-bold text-xs text-primary">
                      {item.program.initialism}
                    </Badge>
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                      {item.program.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-medium">
                  {new Date(item.created_at).toLocaleDateString()}
                </TableCell>

                <Can anyPermission={[PERMISSIONS.FACULTY_CREATE, PERMISSIONS.FACULTY_UPDATE]}>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
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
                              <span>Transfer Department</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => onDelete(item)}
                              className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Remove Appointment</span>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => onRestore(item)}
                            className="gap-2 text-primary focus:bg-primary/10 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Restore Appointment</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </Can>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
