import type { Request } from "express";

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleCallbackUrl(req: Request) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const proto = (req.get("x-forwarded-proto") || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = (req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  return `${proto}://${host}/api/auth/oauth/google/callback`;
}

export function buildGoogleAuthorizeUrl(req: Request, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleCallbackUrl(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
  error_description?: string;
  error?: string;
};

type GoogleProfile = {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  picture?: string;
};

export function isInternalStaffEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain === "firstregistrars.com" || domain === "firstregistrarsnigeria.com";
}

export async function exchangeGoogleCodeForProfile(req: Request, code: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      redirect_uri: googleCallbackUrl(req),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || "Google token exchange failed");
  }

  const meRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const me = (await meRes.json()) as GoogleProfile;
  if (!meRes.ok) {
    throw new Error("Could not read your Google profile");
  }

  const email = (me.email || "").trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Your Google account does not have an email we can use");
  }
  if (me.email_verified === false || me.email_verified === "false") {
    throw new Error("Please verify your Google email address, then try again.");
  }

  return {
    email,
    name: (me.name || me.given_name || email.split("@")[0]).trim(),
    avatarUrl: me.picture || null,
  };
}
