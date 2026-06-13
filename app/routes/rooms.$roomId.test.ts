import { beforeEach, describe, expect, it, vi } from "vitest";

import { action, loader } from "./rooms.$roomId";
import { castVote, getRoom } from "~/domains/rooms/room.server";

vi.mock("~/domains/rooms/room.server", () => ({
  castVote: vi.fn(),
  getRoom: vi.fn(),
}));

const roomServer = vi.mocked({ castVote, getRoom });
const context = {} as never;
const pattern = {} as never;

const room = {
  room: {
    id: "room-1",
    question: "Where should we eat?",
    createdAt: new Date("2026-06-11T00:00:00.000Z"),
  },
  options: [
    {
      id: "option-1",
      roomId: "room-1",
      label: "Pizza",
      position: 1,
      votes: 2,
    },
    {
      id: "option-2",
      roomId: "room-1",
      label: "Ramen",
      position: 2,
      votes: 1,
    },
  ],
  selectedOptionId: "option-2",
  totalVotes: 3,
};

describe("room route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads a room for the current voter", async () => {
    roomServer.getRoom.mockResolvedValue(room);

    const result = await loader({
      request: new Request("http://localhost/rooms/room-1", {
        headers: { Cookie: "decision_voter_id=voter-1" },
      }),
      params: { roomId: "room-1" },
      context,
      url: new URL("http://localhost/rooms/room-1"),
      pattern,
    });

    expect(result).toBe(room);
    expect(roomServer.getRoom).toHaveBeenCalledWith("room-1", "voter-1");
  });

  it("throws a 404 response when the room does not exist", async () => {
    roomServer.getRoom.mockResolvedValue(null);

    const response = await catchRouteResponse(
      loader({
        request: new Request("http://localhost/rooms/missing-room"),
        params: { roomId: "missing-room" },
        context,
        url: new URL("http://localhost/rooms/missing-room"),
        pattern,
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Sala não encontrada");
  });

  it("casts a vote and sets the existing voter cookie", async () => {
    roomServer.castVote.mockResolvedValue({ ok: true });

    const formData = new FormData();
    formData.set("optionId", "option-1");

    const result = await action({
      request: new Request("http://localhost/rooms/room-1", {
        method: "POST",
        body: formData,
        headers: { Cookie: "decision_voter_id=voter-1" },
      }),
      params: { roomId: "room-1" },
      context,
      url: new URL("http://localhost/rooms/room-1"),
      pattern,
    });

    expect(roomServer.castVote).toHaveBeenCalledWith("room-1", "voter-1", {
      optionId: "option-1",
    });
    const response = routeResultToResponse(result);

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain(
      "decision_voter_id=voter-1",
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns validation errors without casting a blank vote", async () => {
    const formData = new FormData();
    formData.set("optionId", "");

    const result = await action({
      request: new Request("http://localhost/rooms/room-1", {
        method: "POST",
        body: formData,
        headers: { Cookie: "decision_voter_id=voter-1" },
      }),
      params: { roomId: "room-1" },
      context,
      url: new URL("http://localhost/rooms/room-1"),
      pattern,
    });

    expect(roomServer.castVote).not.toHaveBeenCalled();
    const response = routeResultToResponse(result);

    expect(response.status).toBe(400);
    expect(response.headers.get("Set-Cookie")).toContain(
      "decision_voter_id=voter-1",
    );
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: { optionId: ["Escolha uma opção"] },
    });
  });

  it("returns domain errors for options outside the room", async () => {
    roomServer.castVote.mockResolvedValue({
      ok: false,
      error: "Essa opção não pertence a esta sala.",
    });

    const formData = new FormData();
    formData.set("optionId", "option-9");

    const result = await action({
      request: new Request("http://localhost/rooms/room-1", {
        method: "POST",
        body: formData,
        headers: { Cookie: "decision_voter_id=voter-1" },
      }),
      params: { roomId: "room-1" },
      context,
      url: new URL("http://localhost/rooms/room-1"),
      pattern,
    });

    expect(roomServer.castVote).toHaveBeenCalledWith("room-1", "voter-1", {
      optionId: "option-9",
    });
    const response = routeResultToResponse(result);

    expect(response.status).toBe(400);
    expect(response.headers.get("Set-Cookie")).toContain(
      "decision_voter_id=voter-1",
    );
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: {
        optionId: ["Essa opção não pertence a esta sala."],
      },
    });
  });
});

async function catchRouteResponse(result: Promise<unknown>) {
  try {
    await result;
  } catch (error) {
    return routeResultToResponse(error);
  }

  throw new Error("Expected route to throw a response");
}

function routeResultToResponse(result: unknown) {
  if (result instanceof Response) {
    return result;
  }

  const { data, init } = result as {
    data: unknown;
    init?: ResponseInit | number | null;
  };

  if (typeof data === "string") {
    return new Response(data, responseInit(init));
  }

  return Response.json(data, responseInit(init));
}

function responseInit(init: ResponseInit | number | null | undefined) {
  return typeof init === "number" ? { status: init } : (init ?? undefined);
}
