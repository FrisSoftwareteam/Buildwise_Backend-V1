export const PMO_INVITE_CC = [
  "olusegun.adeyemi@firstregistrarsnigeria.com",
  "emmanuel.effiong@firstregistrarsnigeria.com",
  "adetoro.johnson@firstregistrarsnigeria.com",
  "olufemi.oyelami@firstregistrarsnigeria.com",
  "ifeanyi.ayodeji@firstregistrarsnigeria.com",
  "colin.decorce@firstregistrarsnigeria.com",
  "pelumi.akinwole@firstregistrarsnigeria.com",
  "kemi.michael-noah@firstregistrarsnigeria.com",
];

export function pmoInviteCc(excludeEmail?: string) {
  const skip = (excludeEmail || "").trim().toLowerCase();
  return PMO_INVITE_CC.filter((email) => email !== skip);
}
