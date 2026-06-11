import * as z from "zod";

export const MIN_ROOM_OPTIONS = 2;
export const MAX_ROOM_OPTIONS = 10;
export const DEFAULT_ROOM_OPTIONS = 2;

const optionLabel = z
  .string()
  .trim()
  .min(1, "Option cannot be blank")
  .max(80, "Keep options under 80 characters");

export const createRoomParams = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "Question cannot be blank")
      .max(140, "Keep the question under 140 characters"),
    options: z
      .array(optionLabel)
      .min(MIN_ROOM_OPTIONS, "Add at least 2 options")
      .max(MAX_ROOM_OPTIONS, "Add no more than 10 options"),
  })
  .superRefine(({ options }, ctx) => {
    const seen = new Set<string>();

    options.forEach((option, index) => {
      const key = option.toLocaleLowerCase();

      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "Options must be unique",
          path: ["options", index],
        });
      }

      seen.add(key);
    });
  });

export const voteParams = z.object({
  optionId: z.string().min(1, "Choose an option"),
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
