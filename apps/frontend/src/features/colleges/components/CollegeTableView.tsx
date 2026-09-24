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
  GraduationCap,
} from "lucide-react";
import type { GetCollege } from "@my-app/shared";
import { useNavigate } from "react-router";

interface CollegeTableViewProps {
  colleges: GetCollege[];
  isArchivedView: boolean;
  onEdit: (college: GetCollege) => void;
  onDelete: (college: GetCollege) => void;
  onRestore: (college: GetCollege) => void;
}

export function CollegeTableView({
  colleges,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: CollegeTableViewProps) {
  const navigate = useNavigate();

  if (colleges.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No colleges found</h3>
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
            <TableHead className="font-bold">College Name</TableHead>
            <TableHead className="font-bold">Assigned Dean</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {colleges.map((item) => (
            <TableRow key={item.college.id} className="border-border hover:bg-muted/30 transition">
              <TableCell>
                <Badge
                  variant="outline"
                  className="font-mono font-bold bg-primary/10 text-primary border-primary/20"
                >
                  {item.college.initialism}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-foreground">{item.college.name}</TableCell>
              <TableCell>
                {item.dean ? (
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">
                        {item.dean.details.first_name} {item.dean.details.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.dean.account.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground/70 italic">
                    No Dean Assigned
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
                          onClick={() => navigate(`/admin/programs?college_id=${item.college.id}`)}
                          className="gap-2 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span>View Programs</span>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
