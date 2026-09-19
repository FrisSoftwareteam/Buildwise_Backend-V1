export const PMO_INVITE_CC = [
  "kemi.michael-noah@firstregistrarsnigeria.com",
  "adetoro.johnson@firstregistrarsnigeria.com",
  "olusegun.adeyemi@firstregistrarsnigeria.com",
  "olufemi.oyelami@firstregistrarsnigeria.com",
  "emmanuel.effiong@firstregistrarsnigeria.com",
  "pelumi.akinwole@firstregistrarsnigeria.com",
];

export function pmoInviteCc(excludeEmail?: string) {
  const skip = (excludeEmail || "").trim().toLowerCase();
  return PMO_INVITE_CC.filter((email) => email !== skip);
}
