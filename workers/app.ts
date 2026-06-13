import { createRequestHandler } from "react-router";

export default {
  async fetch(request, env, ctx) {
    const handler = createRequestHandler(
      () => import("virtual:react-router/server-build"),
      import.meta.env.MODE,
    );

    return handler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
