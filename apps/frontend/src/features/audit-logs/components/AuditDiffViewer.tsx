interface Props {
  diff?: {
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changedFields?: string[];
  } | null;
}

export function AuditDiffViewer({ diff }: Props) {
  if (!diff || (!diff.oldValues && !diff.newValues)) {
    return <p className="text-xs text-muted-foreground italic">No state changes captured.</p>;
  }

  const keys = Array.from(
    new Set([...Object.keys(diff.oldValues || {}), ...Object.keys(diff.newValues || {})]),
  ).filter((k) => k !== "updated_at" && k !== "created_at" && k !== "id");

  return (
    <div className="border border-border rounded-xl overflow-hidden text-xs">
      <div className="grid grid-cols-3 bg-muted/60 p-2 font-bold text-muted-foreground text-[11px] border-b border-border">
        <span>Field</span>
        <span>Original Value</span>
        <span>Updated Value</span>
      </div>
      <div className="divide-y divide-border/60 max-h-56 overflow-y-auto">
        {keys.map((key) => {
          const oldVal = diff.oldValues?.[key];
          const newVal = diff.newValues?.[key];
          const isChanged = oldVal !== newVal;

          return (
            <div
              key={key}
              className={`grid grid-cols-3 p-2 items-center ${isChanged ? "bg-muted/10" : ""}`}
            >
              <span className="font-mono font-medium text-foreground">{key}</span>
              <span className="font-mono text-destructive line-through truncate pr-2">
                {oldVal !== undefined ? String(oldVal) : "—"}
              </span>
              <span className="font-mono text-success font-semibold truncate">
                {newVal !== undefined ? String(newVal) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
