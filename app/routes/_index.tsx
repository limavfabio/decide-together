import { useEffect, useState } from "react";
import { Form, redirect } from "react-router";
import * as z from "zod";

import type { Route } from "./+types/_index";
import {
  DEFAULT_ROOM_OPTIONS,
  MAX_ROOM_OPTIONS,
  MIN_ROOM_OPTIONS,
  parseCreateRoomForm,
} from "~/domains/rooms/params";
import { dbFromContext } from "~/context.server";
import { createRoom } from "~/domains/rooms/room.server";

const questionPlaceholders = [
  "O que vamos comer hoje?",
  "Qual filme vamos assistir?",
  "Onde vai ser o encontro?",
  "Que dia funciona melhor?",
  "Qual o plano para o fim de semana?",
  "Qual a boa para hoje à noite?",
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Decide Together" },
    {
      name: "description",
      content: "Crie uma sala de votação rápida para uma decisão em grupo.",
    },
  ];
}

export function loader() {
  return {
    questionPlaceholder:
      questionPlaceholders[
        Math.floor(Math.random() * questionPlaceholders.length)
      ],
  };
}

export async function action({ context, request }: Route.ActionArgs) {
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

  const roomId = await createRoom(dbFromContext(context), createRoomParams.data);

  return redirect(`/rooms/${roomId}`);
}

export default function Home({ actionData, loaderData }: Route.ComponentProps) {
  const values = actionData?.values;
  const errors = actionData?.errors;
  const initialOptions = normalizeOptionRows(values?.options);
  const [options, setOptions] = useState(initialOptions);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions.join("\u0000")]);

  function addOption() {
    setOptions((currentOptions) =>
      currentOptions.length >= MAX_ROOM_OPTIONS
        ? currentOptions
        : [...currentOptions, ""],
    );
  }

  function removeOption(index: number) {
    setOptions((currentOptions) =>
      currentOptions.length <= MIN_ROOM_OPTIONS
        ? currentOptions
        : currentOptions.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  function updateOption(index: number, value: string) {
    setOptions((currentOptions) =>
      currentOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#221f1a]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[#8a3b16]">
            Decisões rápidas em grupo
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            Coloque as opções na mesa. Deixe a sala decidir.
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
              Pergunta
            </label>
            <input
              id="question"
              name="question"
              type="text"
              maxLength={140}
              defaultValue={values?.question}
              placeholder={loaderData.questionPlaceholder}
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
                Opções
              </label>
              <p className="text-sm font-semibold text-[#6f675c]">
                2 a 10 escolhas
              </p>
            </div>
            <div className="grid gap-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    name="option"
                    type="text"
                    maxLength={80}
                    value={option}
                    onChange={(event) =>
                      updateOption(index, event.target.value)
                    }
                    placeholder={`Opção ${index + 1}`}
                    className="min-w-0 flex-1 border-2 border-[#221f1a] bg-white px-4 py-3 font-semibold outline-none transition focus:shadow-[5px_5px_0_#221f1a]"
                  />
                  {options.length > MIN_ROOM_OPTIONS ? (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="border-2 border-[#221f1a] bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#221f1a]"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {errors?.options ? (
              <p className="mt-2 text-sm font-semibold text-[#a12818]">
                {errors.options[0]}
              </p>
            ) : null}
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= MAX_ROOM_OPTIONS}
              className="mt-4 border-2 border-[#221f1a] bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[4px_4px_0_#221f1a] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Adicionar opção
            </button>
          </div>

          <button
            type="submit"
            className="w-full border-2 border-[#221f1a] bg-[#f2c14e] px-5 py-4 text-lg font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#221f1a] sm:w-fit"
          >
            Criar sala
          </button>
        </Form>
      </section>
    </main>
  );
}

function normalizeOptionRows(options: string[] | undefined) {
  const rows = options?.length
    ? options.slice(0, MAX_ROOM_OPTIONS)
    : Array.from({ length: DEFAULT_ROOM_OPTIONS }, () => "");

  while (rows.length < MIN_ROOM_OPTIONS) {
    rows.push("");
  }

  return rows;
}
