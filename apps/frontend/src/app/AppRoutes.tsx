import { createBrowserRouter } from "react-router";
import { AuthGuard, GuestGuard } from "@/components/route-guards";
import LoginPage from "@/features/auth/page/LoginPage";

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
    children: [],
  },
]);
