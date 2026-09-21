import {
  createUser,
  getUserByEmail,
  getVendorByEmail,
  getVendorInviteByToken,
  listUsersByVendorId,
  markVendorInviteUsed,
  updateUser,
  type User,
} from "@workspace/db";

export async function completeVendorSignIn(input: {
  email: string;
  name: string;
  avatarUrl?: string | null;
  inviteToken?: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  let user = await getUserByEmail(email);
  const invite = input.inviteToken ? await getVendorInviteByToken(input.inviteToken) : null;
  const vendorByEmail = await getVendorByEmail(email);
  const vendorId = invite?.vendorId || user?.vendorId || vendorByEmail?.id || null;

  if (invite) {
    if (invite.usedAt) {
      return { ok: false, error: "This invitation has already been used." };
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return { ok: false, error: "This invitation has expired. Ask PMO to send a new link." };
    }
    if (invite.email !== email) {
      return {
        ok: false,
        error: `Sign in with ${invite.email}. This invitation is tied to that account.`,
      };
    }
  } else if (!vendorId) {
    return {
      ok: false,
      error: "Use the invitation link sent by First Registrars PMO, then sign in with Google or Microsoft.",
    };
  }

  if (vendorId) {
    const members = await listUsersByVendorId(vendorId);
    const alreadyOnAccount = members.some((member) => member.email.toLowerCase() === email);
    if (!alreadyOnAccount && members.length >= 2) {
      return {
        ok: false,
        error: "This vendor account already has two sign-in emails. Ask PMO to replace one of them.",
      };
    }
  }

  if (invite || (vendorId && (!user || user.role !== "vendor" || user.vendorId !== vendorId))) {
    if (!user) {
      user = await createUser({
        name: input.name,
        email,
        role: "vendor",
        department: "External Vendor",
        avatarUrl: input.avatarUrl ?? null,
        vendorId,
      });
    } else {
      user =
        (await updateUser(user.id, {
          name: input.name || user.name,
          avatarUrl: input.avatarUrl || user.avatarUrl,
          role: "vendor",
          vendorId,
        })) ?? user;
    }
    if (invite) {
      await markVendorInviteUsed(invite.id);
    }
  } else if (user && input.name && input.name !== user.name) {
    user =
      (await updateUser(user.id, {
        name: input.name,
        avatarUrl: input.avatarUrl || user.avatarUrl,
      })) ?? user;
  }

  if (!user) {
    return {
      ok: false,
      error: "Use the invitation link sent by First Registrars PMO, then sign in with Google or Microsoft.",
    };
  }

  return { ok: true, user };
}
