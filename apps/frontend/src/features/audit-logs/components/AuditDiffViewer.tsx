import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Minus, Plus } from "lucide-react";

interface Props {
  diff?: {
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changedFields?: string[];
  } | null;
}

export function AuditDiffViewer({ diff }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showOnlyChanged, setShowOnlyChanged] = useState(true);

  if (!diff || (!diff.oldValues && !diff.newValues)) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
        <p className="text-xs text-muted-foreground italic">
          No state changes or snapshots captured.
        </p>
      </div>
    );
  }

  const cleanObj = (obj?: Record<string, any>) => {
    if (!obj || typeof obj !== "object") return {};
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k !== "updated_at" && k !== "created_at" && typeof v !== "function") {
        res[k] = v;
      }
    }
    return res;
  };

  const oldValues = cleanObj(diff.oldValues);
  const newValues = cleanObj(diff.newValues);

  const allKeys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));

  const formatValue = (val: any) => {
    if (val === undefined || val === null) {
      return <span className="text-muted-foreground/60 italic text-[11px]">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <Badge variant="outline" className="text-[10px] font-mono">
          {val ? "true" : "false"}
        </Badge>
      );
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground/60 text-[11px]">[]</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {val.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px] font-mono">
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </Badge>
          ))}
        </div>
      );
    }
    if (typeof val === "object") {
      return (
        <pre className="text-[11px] font-mono bg-muted/50 p-2 rounded-md overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="wrap-break-words whitespace-pre-wrap">{String(val)}</span>;
  };

  const keysToDisplay = showOnlyChanged
    ? allKeys.filter((k) => JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k]))
    : allKeys;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between text-xs border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {keysToDisplay.length} {keysToDisplay.length === 1 ? "field" : "fields"}{" "}
            {showOnlyChanged ? "modified" : "in snapshot"}
          </Badge>
        </div>

        {allKeys.length > keysToDisplay.length && (
          <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={!showOnlyChanged}
              onChange={(e) => setShowOnlyChanged(!e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span className="text-[11px]">Show all {allKeys.length} fields</span>
          </label>
        )}
      </div>

      {/* ── Field Comparison Cards ── */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {keysToDisplay.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            No value changes detected for this record.
          </p>
        ) : (
          keysToDisplay.map((key) => {
            const oldVal = oldValues[key];
            const newVal = newValues[key];
            const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

            return (
              <div
                key={key}
                className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs"
              >
                {/* Field Header */}
                <div className="px-3.5 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-foreground">{key}</span>
                  {isChanged ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                      Modified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Unchanged
                    </Badge>
                  )}
                </div>

                {/* Before / After Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border text-xs">
                  {/* Before */}
                  <div className="p-3 bg-destructive/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-destructive/80">
                      <span className="flex items-center gap-1">
                        <Minus className="w-3 h-3" /> Original Value
                      </span>
                      {oldVal !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleCopy(String(oldVal), `${key}-old`)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Copy original"
                        >
                          {copiedKey === `${key}-old` ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-destructive/90 pt-1 leading-relaxed wrap-break-words">
                      {formatValue(oldVal)}
                    </div>
                  </div>

                  {/* After */}
                  <div className="p-3 bg-success/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-success">
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Updated Value
                      </span>
                      {newVal !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleCopy(String(newVal), `${key}-new`)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Copy updated"
                        >
                          {copiedKey === `${key}-new` ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-success font-semibold pt-1 leading-relaxed wrap-break-words">
                      {formatValue(newVal)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
