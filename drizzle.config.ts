import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./app/domains/**/schema.server.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DB_FILE_NAME ?? "sqlite.db",
  },
});
