import {
  findRoom,
  findVoterOption,
  insertRoom,
  listRoomOptions,
  listVoteTotals,
  optionBelongsToRoom,
  upsertVote,
} from "./repo.server";
import type { Db } from "~/db.server";
import type { CreateRoomParams, VoteParams } from "./params";

export async function createRoom(db: Db, params: CreateRoomParams) {
  return insertRoom(db, params.question, params.options);
}

export async function getRoom(db: Db, roomId: string, voterId: string | null) {
  const room = await findRoom(db, roomId);

  if (!room) {
    return null;
  }

  const options = await listRoomOptions(db, roomId);
  const totals = await listVoteTotals(
    db,
    options.map((option) => option.id),
  );
  const selectedOptionId = await findVoterOption(db, roomId, voterId);
  const totalVotes = Array.from(totals.values()).reduce((sum, total) => sum + total, 0);

  return {
    room,
    options: options.map((option) => ({
      ...option,
      votes: totals.get(option.id) ?? 0,
    })),
    selectedOptionId,
    totalVotes,
  };
}

export async function castVote(
  db: Db,
  roomId: string,
  voterId: string,
  params: VoteParams,
) {
  const validOption = await optionBelongsToRoom(db, roomId, params.optionId);

  if (!validOption) {
    return { ok: false as const, error: "Essa opção não pertence a esta sala." };
  }

  await upsertVote(db, roomId, voterId, params.optionId);

  return { ok: true as const };
}
