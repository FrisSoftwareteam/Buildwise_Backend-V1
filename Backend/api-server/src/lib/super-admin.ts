export const SUPER_ADMIN_EMAIL = "ifeanyi.ayodeji@firstregistrarsnigeria.com";

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}

export function isSuperAdminEmail(email?: string | null) {
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL;
}
