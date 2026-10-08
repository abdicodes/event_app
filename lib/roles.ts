export const ROLE_CODES = ["DELEGATE", "GLOBAL_SUPPORT", "LOCAL_SUPPORT", "FACILITATOR"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_OPTIONS: ReadonlyArray<{code: RoleCode; label: string}> = [
  { code: "DELEGATE", label: "Delegate" },
  { code: "GLOBAL_SUPPORT", label: "Global Support" },
  { code: "LOCAL_SUPPORT", label: "Local Support" },
  { code: "FACILITATOR", label: "Facilitator" },
];

export const ROLE_STYLE: Record<RoleCode, {label: string; color: string; textColor: string; template: string}> = {
  DELEGATE: { label: "Delegate", color: "#FF462A", textColor: "#FFFFFF", template: "/badge-templates/delegate.png" },
  GLOBAL_SUPPORT: { label: "Global Support", color: "#FFDC33", textColor: "#111111", template: "/badge-templates/global-support.png" },
  LOCAL_SUPPORT: { label: "Local Support", color: "#CCC7B0", textColor: "#111111", template: "/badge-templates/local-support.png" },
  FACILITATOR: { label: "Facilitator", color: "#6BA75F", textColor: "#FFFFFF", template: "/badge-templates/facilitator.png" },
};

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === "string" && (ROLE_CODES as readonly string[]).includes(value);
}

export function validateGuestRoles(values: unknown): {ok: true; roles: RoleCode[]} | {ok: false; error: string} {
  if (!Array.isArray(values)) return { ok: false, error: "Select at least one role" };
  const roles = values.filter(isRoleCode);
  if (roles.length !== values.length) return { ok: false, error: "Unknown guest role" };
  if (roles.length < 1 || roles.length > 2) return { ok: false, error: "A guest must have 1 or 2 roles" };
  if (new Set(roles).size !== roles.length) return { ok: false, error: "A guest cannot have the same role twice" };
  if (roles.includes("GLOBAL_SUPPORT") && roles.includes("LOCAL_SUPPORT")) {
    return { ok: false, error: "Global Support and Local Support cannot be assigned to the same guest" };
  }
  return { ok: true, roles };
}

/**
 * Badge-colour rule: Delegate always yields to the other role. If a guest has
 * two non-Delegate roles, role 1 is used as the visual badge role.
 */
export function resolveBadgeRole(roles: readonly RoleCode[]): RoleCode {
  if (roles.length >= 2 && roles.includes("DELEGATE")) {
    return roles.find(role => role !== "DELEGATE") ?? "DELEGATE";
  }
  return roles[0] ?? "DELEGATE";
}

export function roleLabels(roles: readonly RoleCode[]) {
  return roles.map(role => ROLE_STYLE[role].label);
}
