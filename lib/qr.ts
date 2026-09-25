export function extractQrToken(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "q");
    if (idx >= 0 && parts[idx + 1]) return sanitize(parts[idx + 1]);
  } catch {
    // Raw token is allowed for printed/testing QR codes.
  }
  return sanitize(value);
}

function sanitize(value: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}
