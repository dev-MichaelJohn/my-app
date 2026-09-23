import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard } from "@/components/route-guards";
import LoginPage from "@/features/auth/page/LoginPage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CollegePage from "@/features/colleges/page/CollegePage";

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
        ],
      },
    ],
  },
]);
