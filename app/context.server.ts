import type { AppLoadContext } from "react-router";

import { createDb } from "./db.server";

export function dbFromContext(context: AppLoadContext) {
  return createDb(context.cloudflare.env.DB);
}

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}
