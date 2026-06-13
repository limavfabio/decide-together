import * as z from "zod";

export const MIN_ROOM_OPTIONS = 2;
export const MAX_ROOM_OPTIONS = 10;
export const DEFAULT_ROOM_OPTIONS = 2;

const optionLabel = z
  .string()
  .trim()
  .min(1, "A opção não pode ficar em branco")
  .max(80, "Use até 80 caracteres por opção");

export const createRoomParams = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "A pergunta não pode ficar em branco")
      .max(140, "Use até 140 caracteres na pergunta"),
    options: z
      .array(optionLabel)
      .min(MIN_ROOM_OPTIONS, "Adicione pelo menos 2 opções")
      .max(MAX_ROOM_OPTIONS, "Adicione no máximo 10 opções"),
  })
  .superRefine(({ options }, ctx) => {
    const seen = new Set<string>();

    options.forEach((option, index) => {
      const key = option.toLocaleLowerCase();

      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "As opções não podem se repetir",
          path: ["options", index],
        });
      }

      seen.add(key);
    });
  });

export const voteParams = z.object({
  optionId: z.string().min(1, "Escolha uma opção"),
});

export type CreateRoomParams = z.infer<typeof createRoomParams>;
export type VoteParams = z.infer<typeof voteParams>;

export function parseCreateRoomForm(formData: FormData) {
  const options = formData
    .getAll("option")
    .map(String)
    .map((option) => option.trim())
    .filter(Boolean);

  return createRoomParams.safeParse({
    question: String(formData.get("question") ?? ""),
    options,
  });
}

export function parseVoteForm(formData: FormData) {
  return voteParams.safeParse({
    optionId: String(formData.get("optionId") ?? ""),
  });
}
