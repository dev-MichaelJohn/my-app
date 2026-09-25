import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard } from "@/components/route-guards";
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

export const AppRoutes = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
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
            element: <></>,
          },
          {
            path: "/admin/semesters",
            element: <SemesterPage />,
          },
          {
            path: "/admin/colleges",
            element: <CollegePage />,
          },
          {
            path: "/admin/programs",
            element: <ProgramPage />,
          },
          {
            path: "/admin/courses",
            element: <CoursePage />,
          },
          {
            path: "/admin/curriculums",
            element: <CurriculumPage />,
          },
          {
            path: "/admin/classes",
            element: <ClassPage />,
          },
          {
            path: "/admin/offerings",
            element: <OfferingPage />,
          },
          {
            path: "/admin/rosters",
            element: <ClassStudentPage />,
          },
          {
            path: "/admin/student-classes",
            element: <StudentClassPage />,
          },
        ],
      },
    ],
  },
]);
