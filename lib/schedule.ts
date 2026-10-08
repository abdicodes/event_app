export type ScheduleInput = {
  day: string;
  start: string;
  end: string | null;
  title: string;
  description: string | null;
  location: string | null;
};

export function parseScheduleInput(body: any): { value?: ScheduleInput; error?: string } {
  const day = typeof body?.day === "string" ? body.day : "";
  const start = typeof body?.startTime === "string" ? body.startTime : "";
  const endRaw = typeof body?.endTime === "string" ? body.endTime : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Choose a valid date" };
  if (!/^\d{2}:\d{2}$/.test(start)) return { error: "Choose a valid start time" };
  if (endRaw && !/^\d{2}:\d{2}$/.test(endRaw)) return { error: "Choose a valid end time" };
  if (endRaw && endRaw < start) return { error: "End time must be after start time" };
  if (title.length < 2 || title.length > 160) return { error: "Programme title must be 2–160 characters" };
  if (description.length > 500 || location.length > 160) return { error: "Programme details are too long" };
  return { value: { day, start, end: endRaw || null, title, description: description || null, location: location || null } };
}
