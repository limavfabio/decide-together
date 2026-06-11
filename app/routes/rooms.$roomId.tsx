import { data, Form, useFetcher } from "react-router";
import * as z from "zod";

import type { Route } from "./+types/rooms.$roomId";
import { parseVoteForm } from "~/domains/rooms/params";
import { castVote, getRoom } from "~/domains/rooms/room.server";
import { ensureVoterId, getVoterId, voterCookieHeader } from "~/domains/rooms/voter-cookie.server";

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData ? `${loaderData.room.question} · Decide Together` : "Room not found" },
    { name: "description", content: "Vote on a shared group decision." },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const room = await getRoom(params.roomId, getVoterId(request));

  if (!room) {
    throw data("Room not found", { status: 404 });
  }

  return room;
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const result = parseVoteForm(formData);
  const voterId = ensureVoterId(request);

  if (!result.success) {
    return data(
      { ok: false, errors: z.flattenError(result.error).fieldErrors },
      { status: 400, headers: { "Set-Cookie": voterCookieHeader(voterId) } },
    );
  }

  const vote = await castVote(params.roomId, voterId, result.data);

  if (!vote.ok) {
    return data(
      { ok: false, errors: { optionId: [vote.error] } },
      { status: 400, headers: { "Set-Cookie": voterCookieHeader(voterId) } },
    );
  }

  return data({ ok: true }, { headers: { "Set-Cookie": voterCookieHeader(voterId) } });
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const isVoting = fetcher.state !== "idle";
  const actionErrors = (
    fetcher.data && "errors" in fetcher.data ? fetcher.data.errors : null
  ) as { optionId?: string[] } | null;
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#221f1a]">
      <section className="mx-auto grid min-h-screen w-full max-w-5xl content-center gap-8 px-5 py-10">
        <div className="flex flex-col gap-4 border-b-2 border-[#221f1a] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[#8a3b16]">
              Voting room
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight sm:text-6xl">
              {loaderData.room.question}
            </h1>
          </div>
          <Form action="/" className="shrink-0">
            <button className="border-2 border-[#221f1a] bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] transition hover:shadow-[4px_4px_0_#221f1a]">
              New room
            </button>
          </Form>
        </div>

        <fetcher.Form method="post" className="grid gap-4">
          {loaderData.options.map((option) => {
            const selected = loaderData.selectedOptionId === option.id;
            const percent = loaderData.totalVotes === 0 ? 0 : Math.round((option.votes / loaderData.totalVotes) * 100);

            return (
              <button
                key={option.id}
                name="optionId"
                value={option.id}
                type="submit"
                disabled={isVoting}
                className="group relative overflow-hidden border-2 border-[#221f1a] bg-white p-0 text-left transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#221f1a] disabled:cursor-wait disabled:opacity-70"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[#f2c14e]"
                  style={{ width: `${percent}%` }}
                  aria-hidden="true"
                />
                <span className="relative grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <span>
                    <span className="block text-xl font-black">{option.label}</span>
                    <span className="mt-1 block text-sm font-bold text-[#6f675c]">
                      {selected ? "Your vote" : "Vote for this"}
                    </span>
                  </span>
                  <span className="text-2xl font-black tabular-nums">
                    {option.votes} <span className="text-base">({percent}%)</span>
                  </span>
                </span>
              </button>
            );
          })}
        </fetcher.Form>

        {actionErrors?.optionId ? <p className="font-semibold text-[#a12818]">{actionErrors.optionId[0]}</p> : null}

        <div className="grid gap-3 text-sm font-semibold text-[#6f675c] sm:grid-cols-[1fr_auto] sm:items-center">
          <p>{loaderData.totalVotes} total votes. Share this page with the group.</p>
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 border-2 border-[#221f1a] bg-white px-3 py-2 font-mono text-xs text-[#221f1a]"
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Share URL"
          />
        </div>
      </section>
    </main>
  );
}
