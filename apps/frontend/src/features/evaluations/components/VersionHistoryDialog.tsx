import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useStudentCategoryHistory,
  useStudentQuestionHistory,
  useSupervisorCategoryHistory,
  useSupervisorQuestionHistory,
  useMeansHistory,
} from "../hooks/useEvaluationBuilder";
import { History, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    id: number;
    title: string;
    type:
      | "student-category"
      | "student-question"
      | "supervisor-category"
      | "supervisor-question"
      | "means";
  };
}

export function VersionHistoryDialog({ open, onOpenChange, target }: Props) {
  const isStudentCat = target.type === "student-category";
  const isStudentQ = target.type === "student-question";
  const isSupervisorCat = target.type === "supervisor-category";
  const isSupervisorQ = target.type === "supervisor-question";
  const isMeans = target.type === "means";

  const { data: studentCatHistory } = useStudentCategoryHistory(target.id, isStudentCat);
  const { data: studentQHistory } = useStudentQuestionHistory(target.id, isStudentQ);
  const { data: supervisorCatHistory } = useSupervisorCategoryHistory(target.id, isSupervisorCat);
  const { data: supervisorQHistory } = useSupervisorQuestionHistory(target.id, isSupervisorQ);
  const { data: meansHistory } = useMeansHistory(target.id, isMeans);

  const historyList =
    studentCatHistory ||
    studentQHistory ||
    supervisorCatHistory ||
    supervisorQHistory ||
    meansHistory ||
    [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <History className="w-5 h-5 text-primary" />
            <span>Revision History</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            Audit trail for: <strong>{target.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {historyList.map((ver: any) => (
            <div
              key={ver.id}
              className={`p-3.5 border rounded-xl space-y-1 text-xs ${
                !ver.deleted_at
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20 opacity-75"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground font-mono">Version {ver.version}</span>
                <Badge variant={!ver.deleted_at ? "default" : "outline"} className="text-[10px]">
                  {!ver.deleted_at ? "Current Active" : "Superseded"}
                </Badge>
              </div>

              <p className="text-sm font-medium text-foreground pt-1">
                {ver.question || ver.name || ver.descriptor}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <Clock className="w-3 h-3" />
                <span>Created on {new Date(ver.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
