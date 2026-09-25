import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ClassStudentTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="w-full border border-border rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/40 flex gap-4">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-md ml-4" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassStudentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border bg-card shadow-xs animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
