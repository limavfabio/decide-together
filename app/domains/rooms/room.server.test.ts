import { beforeEach, describe, expect, it, vi } from "vitest";

import { castVote, createRoom, getRoom } from "./room.server";
import {
  findRoom,
  findVoterOption,
  insertRoom,
  listRoomOptions,
  listVoteTotals,
  optionBelongsToRoom,
  upsertVote,
} from "./repo.server";

vi.mock("./repo.server", () => ({
  findRoom: vi.fn(),
  findVoterOption: vi.fn(),
  insertRoom: vi.fn(),
  listRoomOptions: vi.fn(),
  listVoteTotals: vi.fn(),
  optionBelongsToRoom: vi.fn(),
  upsertVote: vi.fn(),
}));

const repo = vi.mocked({
  findRoom,
  findVoterOption,
  insertRoom,
  listRoomOptions,
  listVoteTotals,
  optionBelongsToRoom,
  upsertVote,
});

const createdRoomId = "00000000-0000-4000-8000-000000000001";
const createdAt = new Date("2026-06-11T00:00:00.000Z");

describe("room server", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("createRoom", () => {
    it("creates a room with the given question and options", async () => {
      repo.insertRoom.mockResolvedValue(createdRoomId);

      const roomId = await createRoom({
        question: "Where should we eat?",
        options: ["Pizza", "Ramen"],
      });

      expect(roomId).toBe("00000000-0000-4000-8000-000000000001");
      expect(repo.insertRoom).toHaveBeenCalledWith("Where should we eat?", [
        "Pizza",
        "Ramen",
      ]);
    });
  });

  describe("getRoom", () => {
    it("returns null when the room does not exist", async () => {
      repo.findRoom.mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof findRoom>>,
      );

      await expect(getRoom("missing-room", "voter-1")).resolves.toBeNull();

      expect(repo.listRoomOptions).not.toHaveBeenCalled();
      expect(repo.listVoteTotals).not.toHaveBeenCalled();
      expect(repo.findVoterOption).not.toHaveBeenCalled();
    });

    it("returns options with vote counts, the selected option, and total votes", async () => {
      const room = { id: "room-1", question: "Where should we eat?", createdAt };
      const firstOption = {
        id: "option-1",
        roomId: "room-1",
        label: "Pizza",
        position: 1,
      };
      const secondOption = {
        id: "option-2",
        roomId: "room-1",
        label: "Ramen",
        position: 2,
      };

      repo.findRoom.mockResolvedValue(room);
      repo.listRoomOptions.mockResolvedValue([firstOption, secondOption]);
      repo.listVoteTotals.mockResolvedValue(
        new Map([
          ["option-1", 3],
          ["option-2", 1],
        ]),
      );
      repo.findVoterOption.mockResolvedValue("option-2");

      await expect(getRoom("room-1", "voter-1")).resolves.toEqual({
        room,
        options: [
          { ...firstOption, votes: 3 },
          { ...secondOption, votes: 1 },
        ],
        selectedOptionId: "option-2",
        totalVotes: 4,
      });

      expect(repo.listVoteTotals).toHaveBeenCalledWith(["option-1", "option-2"]);
      expect(repo.findVoterOption).toHaveBeenCalledWith("room-1", "voter-1");
    });

    it("defaults missing vote totals to zero", async () => {
      const option = {
        id: "option-1",
        roomId: "room-1",
        label: "Pizza",
        position: 1,
      };

      repo.findRoom.mockResolvedValue({
        id: "room-1",
        question: "Where should we eat?",
        createdAt,
      });
      repo.listRoomOptions.mockResolvedValue([option]);
      repo.listVoteTotals.mockResolvedValue(new Map());
      repo.findVoterOption.mockResolvedValue(null);

      const result = await getRoom("room-1", null);

      expect(result?.options).toEqual([{ ...option, votes: 0 }]);
      expect(result?.selectedOptionId).toBeNull();
      expect(result?.totalVotes).toBe(0);
    });
  });

  describe("castVote", () => {
    it("rejects votes for options outside the room", async () => {
      repo.optionBelongsToRoom.mockResolvedValue(false);

      await expect(
        castVote("room-1", "voter-1", { optionId: "option-9" }),
      ).resolves.toEqual({
        ok: false,
        error: "Essa opção não pertence a esta sala.",
      });

      expect(repo.upsertVote).not.toHaveBeenCalled();
    });

    it("records votes for options that belong to the room", async () => {
      repo.optionBelongsToRoom.mockResolvedValue(true);
      repo.upsertVote.mockResolvedValue(undefined);

      await expect(
        castVote("room-1", "voter-1", { optionId: "option-1" }),
      ).resolves.toEqual({ ok: true });

      expect(repo.upsertVote).toHaveBeenCalledWith(
        "room-1",
        "voter-1",
        "option-1",
      );
    });
  });
});
