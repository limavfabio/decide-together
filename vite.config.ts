import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => ({
  plugins: [
    command === "serve" && mode !== "test" ? cloudflareDevProxy() : null,
    tailwindcss(),
    reactRouter(),
  ].filter(Boolean),
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["**/.react-router/**", "**/node_modules/**"],
  },
}));
