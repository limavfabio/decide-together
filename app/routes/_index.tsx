import { Form, redirect } from "react-router";
import * as z from "zod";

import type { Route } from "./+types/_index";
import { parseCreateRoomForm } from "~/domains/rooms/params";
import { createRoom } from "~/domains/rooms/room.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Decide Together" },
    {
      name: "description",
      content: "Create a quick voting room for a group decision.",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const createRoomParams = parseCreateRoomForm(formData);

  if (!createRoomParams.success) {
    return {
      values: {
        question: String(formData.get("question") ?? ""),
        options: formData.getAll("option").map(String),
      },
      errors: z.flattenError(createRoomParams.error).fieldErrors,
    };
  }

  const roomId = await createRoom(createRoomParams.data);

  return redirect(`/rooms/${roomId}`);
}

export default function Home({ actionData }: Route.ComponentProps) {
  const values = actionData?.values;
  const errors = actionData?.errors;
  const options = values?.options.length ? values.options : ["", "", "", ""];

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#221f1a]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[#8a3b16]">
            Quick group decisions
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            Put the options on the table. Let the room decide.
          </h1>
        </div>

        <Form
          method="post"
          className="grid gap-6 border-y-2 border-[#221f1a] py-8"
        >
          <div>
            <label
              htmlFor="question"
              className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]"
            >
              Question
            </label>
            <input
              id="question"
              name="question"
              type="text"
              maxLength={140}
              defaultValue={values?.question}
              placeholder="What are we eating tonight?"
              className="w-full border-2 border-[#221f1a] bg-white px-4 py-4 text-xl font-semibold outline-none transition focus:shadow-[6px_6px_0_#221f1a]"
            />
            {errors?.question ? (
              <p className="mt-2 text-sm font-semibold text-[#a12818]">
                {errors.question[0]}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between gap-4">
              <label className="block text-sm font-bold uppercase tracking-[0.18em]">
                Options
              </label>
              <p className="text-sm font-semibold text-[#6f675c]">
                3 required, 1 optional
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  name="option"
                  type="text"
                  maxLength={80}
                  defaultValue={options[index] ?? ""}
                  placeholder={
                    index === 3 ? "Optional wild card" : `Option ${index + 1}`
                  }
                  className="border-2 border-[#221f1a] bg-white px-4 py-3 font-semibold outline-none transition focus:shadow-[5px_5px_0_#221f1a]"
                />
              ))}
            </div>
            {errors?.options ? (
              <p className="mt-2 text-sm font-semibold text-[#a12818]">
                {errors.options[0]}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full border-2 border-[#221f1a] bg-[#f2c14e] px-5 py-4 text-lg font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#221f1a] sm:w-fit"
          >
            Create room
          </button>
        </Form>
      </section>
    </main>
  );
}
