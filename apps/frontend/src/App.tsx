import { RouterProvider } from "react-router";
import { AppProvider } from "./app/AppProvider";
import { AppRoutes } from "./app/AppRoutes";

export const App = () => (
  <AppProvider>
    <RouterProvider router={AppRoutes} />
  </AppProvider>
);
