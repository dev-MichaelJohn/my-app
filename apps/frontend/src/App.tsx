import { AppProvider } from "./app/AppProvider";
import { AppRoutes } from "./app/AppRoutes";

export const App = () => (
  <AppProvider>
    <AppRoutes />
  </AppProvider>
);
