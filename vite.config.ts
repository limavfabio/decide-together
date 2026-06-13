import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    command === "serve" && mode !== "test" ? cloudflare() : null,
  ].filter(Boolean),
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["**/.react-router/**", "**/node_modules/**"],
  },
}));
