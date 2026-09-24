import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProgramTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="w-full border border-border rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/40 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgramGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border bg-card shadow-xs animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 border border-border/50">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
