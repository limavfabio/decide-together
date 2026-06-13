import { describe, expect, it, vi } from "vitest";

import { action } from "./_index";
import { createRoom } from "~/domains/rooms/room.server";

vi.mock("~/domains/rooms/room.server", () => ({
  createRoom: vi.fn(),
}));

const roomServer = vi.mocked({ createRoom });
const pattern = {} as never;

describe("home route", () => {
  it("returns field errors and submitted values for an invalid room form", async () => {
    const formData = new FormData();
    formData.set("question", "");
    formData.append("option", "Pizza");
    formData.append("option", "");

    const result = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: createTestContext(),
      url: new URL("http://localhost/"),
      pattern,
    });

    expect(result).toEqual({
      values: {
        question: "",
        options: ["Pizza", ""],
      },
      errors: {
        question: ["A pergunta não pode ficar em branco"],
        options: ["Adicione pelo menos 2 opções"],
      },
    });
    expect(roomServer.createRoom).not.toHaveBeenCalled();
  });

  it("creates a valid room and redirects to it", async () => {
    roomServer.createRoom.mockResolvedValue("00000000-0000-4000-8000-000000000001");

    const formData = new FormData();
    formData.set("question", "Where should we eat?");
    formData.append("option", "Pizza");
    formData.append("option", "Ramen");

    const response = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: createTestContext(),
      url: new URL("http://localhost/"),
      pattern,
    });

    expect(roomServer.createRoom).toHaveBeenCalledWith(expect.anything(), {
      question: "Where should we eat?",
      options: ["Pizza", "Ramen"],
    });
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error("Expected a redirect response");
    }

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/rooms/00000000-0000-4000-8000-000000000001",
    );
  });
});

function createTestContext() {
  return {
    cloudflare: {
      env: { DB: {} as D1Database },
      ctx: {} as ExecutionContext,
    },
  };
}
