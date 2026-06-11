import { and, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "~/db.server";
import { roomOptions, rooms, votes } from "./schema.server";

export async function insertRoom(question: string, options: string[]) {
  const roomId = crypto.randomUUID();

  await db.insert(rooms).values({
    id: roomId,
    question,
  });

  await db.insert(roomOptions).values(
    options.map((label, index) => ({
      id: crypto.randomUUID(),
      roomId,
      label,
      position: index + 1,
    })),
  );

  return roomId;
}

export async function findRoom(roomId: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

  return room ?? null;
}

export async function listRoomOptions(roomId: string) {
  return db
    .select()
    .from(roomOptions)
    .where(eq(roomOptions.roomId, roomId))
    .orderBy(roomOptions.position);
}

export async function listVoteTotals(optionIds: string[]) {
  if (optionIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      optionId: votes.optionId,
      total: count(),
    })
    .from(votes)
    .where(inArray(votes.optionId, optionIds))
    .groupBy(votes.optionId);

  return new Map(rows.map((row) => [row.optionId, row.total]));
}

export async function findVoterOption(roomId: string, voterId: string | null) {
  if (!voterId) {
    return null;
  }

  const [vote] = await db
    .select({ optionId: votes.optionId })
    .from(votes)
    .where(and(eq(votes.roomId, roomId), eq(votes.voterId, voterId)))
    .limit(1);

  return vote?.optionId ?? null;
}

export async function optionBelongsToRoom(roomId: string, optionId: string) {
  const [option] = await db
    .select({ id: roomOptions.id })
    .from(roomOptions)
    .where(and(eq(roomOptions.roomId, roomId), eq(roomOptions.id, optionId)))
    .limit(1);

  return Boolean(option);
}

export async function upsertVote(roomId: string, voterId: string, optionId: string) {
  await db
    .insert(votes)
    .values({
      roomId,
      voterId,
      optionId,
    })
    .onConflictDoUpdate({
      target: [votes.roomId, votes.voterId],
      set: {
        optionId,
        updatedAt: sql`(unixepoch())`,
      },
    });
}
