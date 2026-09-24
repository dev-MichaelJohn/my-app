import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard } from "@/components/route-guards";
import LoginPage from "@/features/auth/page/LoginPage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CollegePage from "@/features/colleges/page/CollegePage";
import ProgramPage from "@/features/programs/page/ProgramPage";
import CoursePage from "@/features/courses/page/CoursePage";
import CurriculumPage from "@/features/curriculums/page/CurriculumPage";

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
        ],
      },
    ],
  },
]);
