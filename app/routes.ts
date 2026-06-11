import { flatRoutes } from "@react-router/fs-routes";
import type { RouteConfig } from "@react-router/dev/routes";

export default flatRoutes({
  ignoredRouteFiles: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
}) satisfies RouteConfig;
