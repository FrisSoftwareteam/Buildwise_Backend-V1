const MAX_VENDOR_EMAILS = 2;

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
