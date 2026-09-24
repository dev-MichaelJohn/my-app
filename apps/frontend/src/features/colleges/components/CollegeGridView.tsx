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
  Building2,
  UserCheck,
  ShieldAlert,
  GraduationCap,
} from "lucide-react";
import type { GetCollege } from "@my-app/shared";
import { useNavigate } from "react-router";

interface CollegeGridViewProps {
  colleges: GetCollege[];
  isArchivedView: boolean;
  onEdit: (college: GetCollege) => void;
  onDelete: (college: GetCollege) => void;
  onRestore: (college: GetCollege) => void;
}

export function CollegeGridView({
  colleges,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: CollegeGridViewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {colleges.map((item) => (
        <Card
          key={item.college.id}
          className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <Badge
                variant="outline"
                className="font-mono font-bold text-primary border-primary/20"
              >
                {item.college.initialism}
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
                      onClick={() => navigate(`/admin/programs?college_id=${item.college.id}`)}
                      className="gap-2 cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>View Programs</span>
                    </DropdownMenuItem>
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

          <CardContent className="space-y-4 pt-1">
            <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
              {item.college.name}
            </h3>

            {/* Assigned Dean Box */}
            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Appointed Dean
              </p>
              {item.dean ? (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-foreground truncate">
                      {item.dean.details.first_name} {item.dean.details.last_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.dean.account.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/70 italic">No Dean Assigned</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
            <span>ID: #{item.college.id}</span>
            <span>{isArchivedView ? "Archived" : "Active"}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
