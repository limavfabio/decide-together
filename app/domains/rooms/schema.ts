import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const roomOptions = sqliteTable(
  "room_options",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    index("room_options_room_id_idx").on(table.roomId),
    uniqueIndex("room_options_room_id_position_idx").on(table.roomId, table.position),
  ],
);

export const votes = sqliteTable(
  "votes",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    voterId: text("voter_id").notNull(),
    optionId: text("option_id")
      .notNull()
      .references(() => roomOptions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("votes_room_id_voter_id_idx").on(table.roomId, table.voterId),
    index("votes_option_id_idx").on(table.optionId),
  ],
);

export type Room = typeof rooms.$inferSelect;
export type RoomOption = typeof roomOptions.$inferSelect;
