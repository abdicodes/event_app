export type PollChoiceMode = "SINGLE" | "MULTIPLE";

export type PollInput = {
  title: string;
  description: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  options: string[];
  choiceMode: PollChoiceMode;
  minSelections: number;
  maxSelections: number;
};

export function parsePollInput(body: any): { value?: PollInput; error?: string } {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const options = Array.isArray(body?.options)
    ? body.options.map((v: any) => String(v).trim()).filter(Boolean)
    : [];
  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  const choiceMode: PollChoiceMode = body?.choiceMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
  const requestedMin = Number(body?.minSelections);
  const requestedMax = Number(body?.maxSelections);
  const minSelections = choiceMode === "SINGLE" ? 1 : requestedMin;
  const maxSelections = choiceMode === "SINGLE" ? 1 : requestedMax;

  if (title.length < 2 || title.length > 160) return { error: "Poll title must be 2–160 characters" };
  if (description.length > 500) return { error: "Description is too long" };
  if (options.length < 2 || options.length > 20 || options.some((v: string) => v.length > 160)) {
    return { error: "Provide between 2 and 20 valid options" };
  }
  if (
    (startsAt && Number.isNaN(startsAt.getTime())) ||
    (endsAt && Number.isNaN(endsAt.getTime())) ||
    (startsAt && endsAt && endsAt < startsAt)
  ) return { error: "Invalid poll time window" };

  if (choiceMode === "MULTIPLE") {
    if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections)) {
      return { error: "Minimum and maximum selections must be whole numbers" };
    }
    if (minSelections < 1 || maxSelections < minSelections || maxSelections > options.length) {
      return { error: `Choose a valid selection range between 1 and ${options.length}` };
    }
  }

  return {
    value: {
      title,
      description: description || null,
      startsAt,
      endsAt,
      options,
      choiceMode,
      minSelections,
      maxSelections,
    },
  };
}

export function pollIsOpen(startsAt: string | Date | null, endsAt: string | Date | null, now = Date.now()) {
  const starts = startsAt ? new Date(startsAt).getTime() : -Infinity;
  const ends = endsAt ? new Date(endsAt).getTime() : Infinity;
  return starts <= now && now <= ends;
}

export function validateSelectionCount(mode: PollChoiceMode, count: number, minSelections: number, maxSelections: number) {
  if (!Number.isInteger(count) || count < 1) return "Select at least one option";
  if (mode === "SINGLE") return count === 1 ? null : "Select exactly one option";
  if (count < minSelections || count > maxSelections) {
    return minSelections === maxSelections
      ? `Select exactly ${minSelections} options`
      : `Select between ${minSelections} and ${maxSelections} options`;
  }
  return null;
}
