import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard } from "@/components/route-guards";
import LoginPage from "@/features/auth/page/LoginPage";
import DashboardLayout from "@/components/layout/DashboardLayout";

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
        ],
      },
    ],
  },
]);
