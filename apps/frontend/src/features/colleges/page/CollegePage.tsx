import { useState, useEffect } from "react";
import { LayoutGrid, List, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useColleges,
  useDeleteCollege,
  useRestoreCollege,
} from "@/features/colleges/hooks/useColleges";
import { CollegeTableView } from "@/features/colleges/components/CollegeTableView";
import { CollegeGridView } from "@/features/colleges/components/CollegeGridView";
import {
  CollegeTableSkeleton,
  CollegeGridSkeleton,
} from "@/features/colleges/components/CollegeSkeletons";
import type { CollegeQuery } from "@my-app/shared";

export default function CollegePage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("colleges_view_mode") as "table" | "grid") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("colleges_view_mode", viewMode);
  }, [viewMode]);

  const [query, setQuery] = useState<CollegeQuery>({
    paginate: true,
    page: 1,
    limit: 9,
    search: "",
    is_archived: false,
    sort_by: "name",
    order: "asc",
  });

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: response, isLoading, isPlaceholderData } = useColleges(query);
  const deleteMutation = useDeleteCollege();
  const restoreMutation = useRestoreCollege();

  const colleges = response?.data ?? [];
  const pagination = response?.pagination;

  const handlePageSizeChange = (val: string) => {
    if (val === "all") {
      setQuery((prev) => ({
        ...prev,
        paginate: false,
        page: 1,
      }));
    } else {
      setQuery((prev) => ({
        ...prev,
        paginate: true,
        limit: Number(val),
        page: 1,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Colleges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage institutional colleges and appointed academic deans.
          </p>
        </div>

        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Add College</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or code..."
            className="pl-9 bg-card border-border"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
          <Tabs
            value={query.is_archived ? "archived" : "active"}
            onValueChange={(val) =>
              setQuery((prev) => ({ ...prev, is_archived: val === "archived", page: 1 }))
            }
          >
            <TabsList className="bg-muted border border-border">
              <TabsTrigger value="active" className="text-xs">
                Active
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={!query.paginate ? "all" : String(query.limit ?? 9)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[110px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Page Size" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              <SelectItem value="9">9 per page</SelectItem>
              <SelectItem value="18">18 per page</SelectItem>
              <SelectItem value="36">36 per page</SelectItem>
              <SelectItem value="all">Show All</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border border-border rounded-lg bg-muted p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className={
          isPlaceholderData ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"
        }
      >
        {isLoading ? (
          viewMode === "table" ? (
            <CollegeTableSkeleton rows={6} />
          ) : (
            <CollegeGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <CollegeTableView
            colleges={colleges}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(college) => console.log("Edit:", college)}
            onDelete={(college) => deleteMutation.mutate(college.college.id)}
            onRestore={(college) => restoreMutation.mutate(college.college.id)}
          />
        ) : (
          <CollegeGridView
            colleges={colleges}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(college) => console.log("Edit:", college)}
            onDelete={(college) => deleteMutation.mutate(college.college.id)}
            onRestore={(college) => restoreMutation.mutate(college.college.id)}
          />
        )}
      </div>

      {query.paginate && pagination && pagination.totalPage > 1 ? (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPage} ({pagination.totalItems}{" "}
            colleges)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setQuery((prev) => ({ ...prev, page: prev.page! - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setQuery((prev) => ({ ...prev, page: prev.page! + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Showing all {colleges.length} {query.is_archived ? "archived" : "active"} college(s)
          </p>
        </div>
      )}
    </div>
  );
}
