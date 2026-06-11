import {
  findRoom,
  findVoterOption,
  insertRoom,
  listRoomOptions,
  listVoteTotals,
  optionBelongsToRoom,
  upsertVote,
} from "./repo.server";
import type { CreateRoomParams, VoteParams } from "./params";

export async function createRoom(params: CreateRoomParams) {
  return insertRoom(params.question, params.options);
}

export async function getRoom(roomId: string, voterId: string | null) {
  const room = await findRoom(roomId);

  if (!room) {
    return null;
  }

  const options = await listRoomOptions(roomId);
  const totals = await listVoteTotals(options.map((option) => option.id));
  const selectedOptionId = await findVoterOption(roomId, voterId);
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

export async function castVote(roomId: string, voterId: string, params: VoteParams) {
  const validOption = await optionBelongsToRoom(roomId, params.optionId);

  if (!validOption) {
    return { ok: false as const, error: "That option does not belong to this room." };
  }

  await upsertVote(roomId, voterId, params.optionId);

  return { ok: true as const };
}
