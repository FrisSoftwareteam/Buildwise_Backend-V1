const MAX_VENDOR_EMAILS = 2;

export const EXTRA_VENDOR_MAIL_COPIES: Record<string, string[]> = {
  "joy.wilfred96@gmail.com": ["wilfred.joy@itech.ng", "williams.abiola@itech.ng"],
};

export function uniqueEmails(...emails: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const value = String(email || "").trim().toLowerCase();
    if (!value.includes("@") || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function vendorAccountEmails(vendor?: {
  contactEmail?: string | null;
  contactEmail2?: string | null;
} | null) {
  return uniqueEmails(vendor?.contactEmail, vendor?.contactEmail2);
}

export function extraMailCopiesFor(emails: Array<string | null | undefined>) {
  const extra: string[] = [];
  for (const email of uniqueEmails(...emails)) {
    extra.push(...(EXTRA_VENDOR_MAIL_COPIES[email] || []));
  }
  return uniqueEmails(...extra);
}

export function vendorNotificationEmails(vendor?: {
  contactEmail?: string | null;
  contactEmail2?: string | null;
} | null) {
  const registered = vendorAccountEmails(vendor);
  return uniqueEmails(...registered, ...extraMailCopiesFor(registered));
}

export function parseInviteEmails(body: { email?: unknown; email2?: unknown; emails?: unknown }) {
  const fromArray = Array.isArray(body.emails) ? body.emails.map((email) => String(email || "")) : [];
  return uniqueEmails(String(body.email || ""), String(body.email2 || ""), ...fromArray);
}

export function mergeVendorEmails(
  current: Array<string | null | undefined>,
  incoming: string[],
): { emails: string[]; error?: string } {
  const emails = uniqueEmails(...current, ...incoming);
  if (emails.length > MAX_VENDOR_EMAILS) {
    return {
      emails: emails.slice(0, MAX_VENDOR_EMAILS),
      error: "A vendor account can have at most two sign-in emails. Remove one before adding another.",
    };
  }
  return { emails };
}

export function vendorEmailFields(emails: string[]) {
  return {
    contactEmail: emails[0] || null,
    contactEmail2: emails[1] || null,
  };
}
