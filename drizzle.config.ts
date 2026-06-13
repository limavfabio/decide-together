import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/domains/**/schema.server.ts",
  out: "./drizzle",
});
