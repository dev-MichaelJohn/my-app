import { Link, useLocation, useSearchParams } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollege } from "@/features/colleges/hooks/useColleges";
import { useProgram } from "@/features/programs/hooks/usePrograms";
import { useClass } from "@/features/classes/hooks/useClasses";
import { Home } from "lucide-react";
import React from "react";
import { useOffering } from "@/features/offerings/hooks/useOfferings";

interface BreadcrumbSegment {
  label: React.ReactNode;
  href?: string;
  isCurrent?: boolean;
}

export function AppBreadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const collegeId = searchParams.get("college_id");
  const programId = searchParams.get("program_id");
  const classId = searchParams.get("class_id");
  const offeringId = searchParams.get("course_offering_id");

  const { data: collegeData, isLoading: isLoadingCollege } = useCollege(
    Number(collegeId),
    Boolean(collegeId),
  );

  const { data: programData, isLoading: isLoadingProgram } = useProgram(
    Number(programId),
    Boolean(programId),
  );

  const { data: classData, isLoading: isLoadingClass } = useClass(
    Number(classId),
    Boolean(classId),
  );

  const { data: offeringData, isLoading: isLoadingOffering } = useOffering(
    Number(offeringId),
    Boolean(offeringId),
  );

  const segments: BreadcrumbSegment[] = [];
  const pathname = location.pathname;

  const renderLabel = (text?: string, isLoading?: boolean) => {
    if (isLoading) return <Skeleton className="h-4 w-14 inline-block align-middle" />;
    return text || "Loading...";
  };

  if (pathname.includes("/admin/colleges")) {
    segments.push({ label: "Colleges", isCurrent: true });
  } else if (pathname.includes("/admin/programs")) {
    segments.push({ label: "Colleges", href: "/admin/colleges" });

    if (collegeId) {
      segments.push({
        label: renderLabel(collegeData?.college.initialism, isLoadingCollege),
        href: `/admin/programs?college_id=${collegeId}`,
      });
      segments.push({ label: "Programs", isCurrent: true });
    } else {
      segments.push({ label: "Academic Programs", isCurrent: true });
    }
  } else if (pathname.includes("/admin/classes")) {
    segments.push({ label: "Programs", href: "/admin/programs" });

    if (programId) {
      segments.push({
        label: renderLabel(programData?.program.initialism, isLoadingProgram),
        href: `/admin/classes?program_id=${programId}`,
      });
      segments.push({ label: "Classes", isCurrent: true });
    } else {
      segments.push({ label: "Academic Classes", isCurrent: true });
    }
  } else if (pathname.includes("/admin/courses")) {
    segments.push({ label: "Programs", href: "/admin/programs" });

    if (programId) {
      segments.push({
        label: renderLabel(programData?.program.initialism, isLoadingProgram),
        href: `/admin/courses?program_id=${programId}`,
      });
      segments.push({ label: "Courses", isCurrent: true });
    } else {
      segments.push({ label: "Courses & Subjects", isCurrent: true });
    }
  } else if (pathname.includes("/admin/curriculums")) {
    segments.push({ label: "Programs", href: "/admin/programs" });

    if (programId) {
      segments.push({
        label: renderLabel(programData?.program.initialism, isLoadingProgram),
        href: `/admin/curriculums?program_id=${programId}`,
      });
      segments.push({ label: "Curriculum", isCurrent: true });
    } else {
      segments.push({ label: "Course Curriculums", isCurrent: true });
    }
  } else if (pathname.includes("/admin/offerings")) {
    segments.push({ label: "Classes", href: "/admin/classes" });

    if (classId) {
      const classLabel = classData
        ? `${classData.program.initialism} ${classData.year_level}-${classData.section}`
        : undefined;

      segments.push({
        label: renderLabel(classLabel, isLoadingClass),
        href: `/admin/offerings?class_id=${classId}`,
      });
      segments.push({ label: "Offerings", isCurrent: true });
    } else {
      segments.push({ label: "Course Offerings", isCurrent: true });
    }
  } else if (pathname.includes("/admin/rosters")) {
    segments.push({ label: "Classes", href: "/admin/classes" });

    if (classId) {
      const classLabel = classData
        ? `${classData.program.initialism} ${classData.year_level}-${classData.section}`
        : undefined;

      segments.push({
        label: renderLabel(classLabel, isLoadingClass),
        href: `/admin/rosters?class_id=${classId}`,
      });
      segments.push({ label: "Roster", isCurrent: true });
    } else {
      segments.push({ label: "Class Rosters", isCurrent: true });
    }
  } else if (pathname.includes("/admin/student-classes")) {
    segments.push({ label: "Course Offerings", href: "/admin/offerings" });

    if (offeringId) {
      const offeringLabel = offeringData
        ? `${offeringData.course_curriculum.course.initialism} (${offeringData.class.program.initialism} ${offeringData.class.year_level}-${offeringData.class.section})`
        : undefined;

      segments.push({
        label: renderLabel(offeringLabel, isLoadingOffering),
        href: `/admin/student-classes?course_offering_id=${offeringId}`,
      });
      segments.push({ label: "Enrolled Students", isCurrent: true });
    } else {
      segments.push({ label: "Student List", isCurrent: true });
    }
  } else if (pathname.includes("/admin/semesters")) {
    segments.push({ label: "Semesters", isCurrent: true });
  } else {
    segments.push({ label: "Dashboard", isCurrent: true });
  }

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList className="text-xs">
        <BreadcrumbItem>
          <BreadcrumbLink>
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast || !segment.href ? (
                  <BreadcrumbPage className="font-semibold text-foreground max-w-[200px] truncate">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink>
                    <Link
                      to={segment.href}
                      className="text-muted-foreground hover:text-foreground transition font-medium max-w-[150px] truncate"
                    >
                      {segment.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
