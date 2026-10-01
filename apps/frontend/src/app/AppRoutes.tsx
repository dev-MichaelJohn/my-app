import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard, PermissionGuard, RoleGuard } from "@/components/route-guards";
import LoginPage from "@/features/auth/page/LoginPage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CollegePage from "@/features/colleges/page/CollegePage";
import ProgramPage from "@/features/programs/page/ProgramPage";
import CoursePage from "@/features/courses/page/CoursePage";
import CurriculumPage from "@/features/curriculums/page/CurriculumPage";
import ClassPage from "@/features/classes/page/ClassPage";
import SemesterPage from "@/features/semesters/page/SemesterPage";
import OfferingPage from "@/features/offerings/page/OfferingPage";
import ClassStudentPage from "@/features/class-students/page/ClassStudentPage";
import StudentClassPage from "@/features/student-classes/page/StudentClassPage";
import EvaluationInstrumentsPage from "@/features/evaluations/page/EvaluationInstrumentsPage";
import EvaluationFormBuilderPage from "@/features/evaluations/page/EvaluationFormBuilderPage";
import EvaluationSchedulesPage from "@/features/evaluation-schedules/page/EvaluationSchedulesPage";
import StudentEvaluationPage from "@/features/evaluations/page/StudentEvaluationPage";
import SupervisorEvaluationPage from "@/features/evaluations/page/SupervisorEvaluationPage";
import UserPage from "@/features/users/page/UserPage";
import { PERMISSIONS } from "@my-app/shared";
import FacultyTeachingPage from "@/features/evaluations/page/FacultyTeachingPage";
import AnnexCReportPage from "@/features/evaluations/page/AnnexCReportPage";

export const AppRoutes = createBrowserRouter([
  // ── Public / Guest Routes ──
  {
    element: <GuestGuard />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },

  // ── Authenticated Routes ──
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "/dashboard",
            element: <></>,
          },

          // ── 1. User Management (SYS_ADMIN & ADMIN only) ──
          {
            element: <RoleGuard allowedRoles={["SYS_ADMIN", "ADMIN"]} />,
            children: [
              {
                path: "/admin/users",
                element: <UserPage />,
              },
            ],
          },

          // ── 2. Evaluation Form Design & Schedules (SYS_ADMIN & ADMIN only) ──
          {
            element: <RoleGuard allowedRoles={["SYS_ADMIN", "ADMIN"]} />,
            children: [
              {
                path: "/admin/evaluation-forms",
                element: <EvaluationInstrumentsPage />,
              },
              {
                path: "/admin/evaluation-forms/:type/:id/builder",
                element: <EvaluationFormBuilderPage />,
              },
              {
                path: "/admin/evaluation-periods",
                element: <EvaluationSchedulesPage />,
              },
            ],
          },

          // ── 3. Institutional Setup (Deans & Chairs have read access) ──
          {
            element: <PermissionGuard permission={PERMISSIONS.SEMESTER_READ} />,
            children: [
              {
                path: "/admin/semesters",
                element: <SemesterPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COLLEGE_READ} />,
            children: [
              {
                path: "/admin/colleges",
                element: <CollegePage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.PROGRAM_READ} />,
            children: [
              {
                path: "/admin/programs",
                element: <ProgramPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_READ} />,
            children: [
              {
                path: "/admin/courses",
                element: <CoursePage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_CURRICULUM_READ} />,
            children: [
              {
                path: "/admin/curriculums",
                element: <CurriculumPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.CLASS_READ} />,
            children: [
              {
                path: "/admin/classes",
                element: <ClassPage />,
              },
            ],
          },

          // ── 4. Academic Operations ──
          {
            element: <RoleGuard allowedRoles={["FACULTY", "SUPERVISOR"]} />,
            children: [
              {
                path: "/faculty/classes",
                element: <FacultyTeachingPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.COURSE_OFFERING_READ} />,
            children: [
              {
                path: "/admin/offerings",
                element: <OfferingPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.CLASS_STUDENT_READ} />,
            children: [
              {
                path: "/admin/rosters",
                element: <ClassStudentPage />,
              },
            ],
          },
          {
            element: <PermissionGuard permission={PERMISSIONS.STUDENT_CLASS_READ} />,
            children: [
              {
                path: "/admin/student-classes",
                element: <StudentClassPage />,
              },
            ],
          },

          // ── 5. Student Evaluation Hub (Students & SysAdmin only) ──
          {
            element: <RoleGuard allowedRoles={["STUDENT"]} />,
            children: [
              {
                path: "/evaluations/student",
                element: <StudentEvaluationPage />,
              },
            ],
          },

          // ── 6. Supervisor Evaluation Hub (Deans, Chairs & SysAdmin only) ──
          {
            element: <RoleGuard allowedRoles={["SUPERVISOR"]} />,
            children: [
              {
                path: "/evaluations/supervisor",
                element: <SupervisorEvaluationPage />,
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
                element: <AnnexCReportPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
