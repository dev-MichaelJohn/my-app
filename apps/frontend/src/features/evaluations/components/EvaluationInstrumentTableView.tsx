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
import { MoreHorizontal, Edit, Trash2, RotateCcw, Wrench, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router";
import type { IStudentEvalFormSelect, ISupervisorEvalFormSelect } from "@my-app/shared";

interface Props {
  forms: (IStudentEvalFormSelect | ISupervisorEvalFormSelect)[];
  formType: "student" | "supervisor";
  isArchivedView: boolean;
  onEdit: (form: IStudentEvalFormSelect | ISupervisorEvalFormSelect) => void;
  onDelete: (form: IStudentEvalFormSelect | ISupervisorEvalFormSelect) => void;
  onRestore: (form: IStudentEvalFormSelect | ISupervisorEvalFormSelect) => void;
}

export function EvaluationInstrumentTableView({
  forms,
  formType,
  isArchivedView,
  onEdit,
  onDelete,
  onRestore,
}: Props) {
  const navigate = useNavigate();

  if (forms.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">No evaluation instruments found</h3>
        <p className="text-xs text-muted-foreground mt-1">Create a form template to get started.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold">Form Title</TableHead>
            <TableHead className="font-bold">Rating Scale</TableHead>
            <TableHead className="font-bold">Target Audience</TableHead>
            <TableHead className="w-[80px] text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <TableRow key={form.id} className="border-border hover:bg-muted/30 transition">
              <TableCell>
                <div className="font-semibold text-foreground">{form.title}</div>
                {form.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                    {form.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono font-bold text-xs">
                  {form.min_rating} – {form.max_rating} Rating Scale
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize text-xs font-semibold">
                  {formType === "student" ? "Student (SET)" : "Supervisor (SEF)"}
                </Badge>
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
                    className="w-48 border-border bg-popover text-popover-foreground"
                  >
                    {!isArchivedView ? (
                      <>
                        {/* 🚀 Open Visual Builder */}
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/admin/evaluation-forms/${formType}/${form.id}/builder`)
                          }
                          className="gap-2 cursor-pointer font-medium text-primary focus:bg-primary/10"
                        >
                          <Wrench className="w-4 h-4 text-primary" />
                          <span>Open Form Builder</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit(form)}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => onDelete(form)}
                          className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Archive</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onRestore(form)}
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
