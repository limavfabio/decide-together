import { describe, expect, it } from "vitest";

import { loader } from "./health";

describe("health route", () => {
  it("returns an ok status payload", async () => {
    const response = routeResultToResponse(loader());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});

function routeResultToResponse(result: unknown) {
  if (result instanceof Response) {
    return result;
  }

  const { data, init } = result as {
    data: unknown;
    init?: ResponseInit | number | null;
  };

  return Response.json(data, responseInit(init));
}

function responseInit(init: ResponseInit | number | null | undefined) {
  return typeof init === "number" ? { status: init } : (init ?? undefined);
}
