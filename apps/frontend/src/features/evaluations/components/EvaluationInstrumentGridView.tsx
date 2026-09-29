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
  Wrench,
  FileCheck2,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
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

export function EvaluationInstrumentGridView({
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form) => (
        <Card
          key={form.id}
          className="border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {formType === "student" ? (
                  <FileCheck2 className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <Badge variant="outline" className="font-mono font-bold text-xs">
                {form.min_rating} – {form.max_rating} Rating
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-border bg-popover">
                {!isArchivedView ? (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/admin/evaluation-forms/${formType}/${form.id}/builder`)
                      }
                      className="gap-2 cursor-pointer font-medium text-primary"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Open Builder</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(form)} className="gap-2 cursor-pointer">
                      <Edit className="w-4 h-4" />
                      <span>Edit Details</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => onDelete(form)}
                      className="gap-2 text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onRestore(form)}
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
            <div>
              <h3 className="font-bold text-base text-foreground leading-snug line-clamp-1">
                {form.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                {form.description || "No description provided."}
              </p>
            </div>

            {/* 🚀 1-Click Open Visual Builder Button */}
            {!isArchivedView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/evaluation-forms/${formType}/${form.id}/builder`)}
                className="w-full text-xs gap-2 h-9 border-border bg-card hover:bg-muted text-foreground"
              >
                <Wrench className="w-3.5 h-3.5 text-primary" />
                <span>Open Form Builder</span>
              </Button>
            )}
          </CardContent>

          <CardFooter className="pt-0 text-[11px] text-muted-foreground justify-between border-t border-border/50 py-3">
            <span>Template #{form.id}</span>
            <span>{isArchivedView ? "Archived" : "Active Template"}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
