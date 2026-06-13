import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "~/domains/rooms/schema.server";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = DrizzleD1Database<typeof schema>;
