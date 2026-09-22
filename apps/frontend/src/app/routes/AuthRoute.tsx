import { LoginForm } from "@/features/auth/components/LoginForm";
import LoginPage from "@/features/auth/page/LoginPage";
import type { RouteObject } from "react-router";

export const AuthRoute: RouteObject = {
  path: "/auth",
  element: <LoginPage />,
  children: [{ path: "login", element: <LoginForm /> }],
};
