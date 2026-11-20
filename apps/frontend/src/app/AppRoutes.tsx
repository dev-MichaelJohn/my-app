import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { PageLoader } from "@/components/ui/spinner";
import { AuthGuard, GuestGuard, PermissionGuard, RoleGuard } from "@/components/route-guards";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PERMISSIONS } from "@my-app/shared";
import FacultyPage from "@/features/faculties/page/FacultyPage";
import AuditLogPage from "@/features/audit-logs/page/AuditLogPage";

const LandingPage = lazy(() => import("@/features/landing/page/LandingPage"));
const LoginPage = lazy(() => import("@/features/auth/page/LoginPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/page/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/page/DashboardPage"));
const AccountSettingsPage = lazy(() => import("@/features/users/page/AccountSettingsPage"));
const UserPage = lazy(() => import("@/features/users/page/UserPage"));
const CollegePage = lazy(() => import("@/features/colleges/page/CollegePage"));
const ProgramPage = lazy(() => import("@/features/programs/page/ProgramPage"));
const CoursePage = lazy(() => import("@/features/courses/page/CoursePage"));
const CurriculumPage = lazy(() => import("@/features/curriculums/page/CurriculumPage"));
const ClassPage = lazy(() => import("@/features/classes/page/ClassPage"));
const SemesterPage = lazy(() => import("@/features/semesters/page/SemesterPage"));
const OfferingPage = lazy(() => import("@/features/offerings/page/OfferingPage"));
const ClassStudentPage = lazy(() => import("@/features/class-students/page/ClassStudentPage"));
const OfferingStudentPage = lazy(
  () => import("@/features/offering-students/page/OfferingStudentPage"),
);
const EvaluationInstrumentsPage = lazy(
  () => import("@/features/evaluations/page/EvaluationInstrumentsPage"),
);
const EvaluationFormBuilderPage = lazy(
  () => import("@/features/evaluations/page/EvaluationFormBuilderPage"),
);
const EvaluationSchedulesPage = lazy(
  () => import("@/features/evaluation-schedules/page/EvaluationSchedulesPage"),
);
const StudentEvaluationPage = lazy(
  () => import("@/features/evaluations/page/StudentEvaluationPage"),
);
const SupervisorEvaluationPage = lazy(
  () => import("@/features/evaluations/page/SupervisorEvaluationPage"),
);
const FacultyTeachingPage = lazy(() => import("@/features/evaluations/page/FacultyTeachingPage"));
const AnnexCReportPage = lazy(() => import("@/features/evaluations/page/AnnexCReportPage"));
const AnalyticsDashboardPage = lazy(
  () => import("@/features/analytics/page/AnalyticsDashboardPage"),
);

function LazyRoute({ Component }: { Component: ComponentType }) {
  return (
    <Suspense fallback={<PageLoader text="Loading page..." />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <LazyRoute Component={LandingPage} />,
  },
  {
    element: <GuestGuard />,
    children: [
      {
        path: "/login",
        element: <LazyRoute Component={LoginPage} />,
      },
      {
        path: "/forgot-password",
        element: <LazyRoute Component={ForgotPasswordPage} />,
      },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "/dashboard",
            element: <LazyRoute Component={DashboardPage} />,
          },
          {
            path: "/settings/account",
            element: <LazyRoute Component={AccountSettingsPage} />,
          },

          {
            element: <RoleGuard allowedRoles={["VPAA", "CLERK"]} />,
            children: [
              {
                path: "/admin/users",
                element: <LazyRoute Component={UserPage} />,
              },
              {
                path: "/admin/evaluation-periods",
                element: <LazyRoute Component={EvaluationSchedulesPage} />,
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["VPAA"]} />,
            children: [
              {
                path: "/admin/audit-logs",
                element: <LazyRoute Component={AuditLogPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.EVALUATION_FORM_READ} />,
            children: [
              {
                path: "/admin/evaluation-forms",
                element: <LazyRoute Component={EvaluationInstrumentsPage} />,
              },
              {
                path: "/admin/evaluation-forms/:type/:id/builder",
                element: <LazyRoute Component={EvaluationFormBuilderPage} />,
              },
            ],
          },

          {
            element: <PermissionGuard permission={PERMISSIONS.SEMESTER_READ} />,
            children: [
              {
                path: "/admin/semesters",
                element: <LazyRoute Component={SemesterPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COLLEGE_READ} />,
            children: [
              {
                path: "/admin/colleges",
                element: <LazyRoute Component={CollegePage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.PROGRAM_READ} />,
            children: [
              {
                path: "/admin/programs",
                element: <LazyRoute Component={ProgramPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_READ} />,
            children: [
              {
                path: "/admin/courses",
                element: <LazyRoute Component={CoursePage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_CURRICULUM_READ} />,
            children: [
              {
                path: "/admin/curriculums",
                element: <LazyRoute Component={CurriculumPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.CLASS_READ} />,
            children: [
              {
                path: "/admin/classes",
                element: <LazyRoute Component={ClassPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.FACULTY_READ} />,
            children: [
              {
                path: "/admin/faculties",
                element: <LazyRoute Component={FacultyPage} />,
              },
            ],
          },

          {
            element: <RoleGuard allowedRoles={["FACULTY", "COLLEGE_DEAN", "DEPARTMENT_CHAIR"]} />,
            children: [
              {
                path: "/faculty/classes",
                element: <LazyRoute Component={FacultyTeachingPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_OFFERING_READ} />,
            children: [
              {
                path: "/admin/offerings",
                element: <LazyRoute Component={OfferingPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.CLASS_STUDENT_READ} />,
            children: [
              {
                path: "/admin/rosters",
                element: <LazyRoute Component={ClassStudentPage} />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.OFFERING_STUDENT_READ} />,
            children: [
              {
                path: "/admin/offering-students",
                element: <LazyRoute Component={OfferingStudentPage} />,
              },
            ],
          },

          {
            element: <RoleGuard allowedRoles={["STUDENT"]} />,
            children: [
              {
                path: "/evaluations/student",
                element: <LazyRoute Component={StudentEvaluationPage} />,
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["COLLEGE_DEAN", "DEPARTMENT_CHAIR"]} />,
            children: [
              {
                path: "/evaluations/supervisor",
                element: <LazyRoute Component={SupervisorEvaluationPage} />,
              },
            ],
          },
          {
            element: (
              <PermissionGuard
                permissions={[
                  PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
                  PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
                ]}
              />
            ),
            children: [
              {
                path: "/reports/faculty",
                element: <LazyRoute Component={AnnexCReportPage} />,
              },
            ],
          },
          {
            element: (
              <PermissionGuard
                permissions={[
                  PERMISSIONS.ANALYTICS_VIEW_INSTITUTION,
                  PERMISSIONS.ANALYTICS_VIEW_COLLEGE,
                  PERMISSIONS.ANALYTICS_VIEW_PROGRAM,
                  PERMISSIONS.ANALYTICS_VIEW_SELF,
                  PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
                  PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
                ]}
              />
            ),
            children: [
              {
                path: "/analytics",
                element: <LazyRoute Component={AnalyticsDashboardPage} />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
