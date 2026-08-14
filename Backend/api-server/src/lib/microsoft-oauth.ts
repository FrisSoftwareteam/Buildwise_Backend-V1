import { randomBytes } from "node:crypto";
import type { Request } from "express";

type PendingState = {
  redirectTo: string;
  createdAt: number;
};

const pendingStates = new Map<string, PendingState>();
const STATE_TTL_MS = 10 * 60 * 1000;

function pruneStates() {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (now - value.createdAt > STATE_TTL_MS) {
      pendingStates.delete(key);
    }
  }
}

export function isMicrosoftOAuthConfigured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function microsoftTenant() {
  return process.env.MICROSOFT_TENANT_ID?.trim() || "common";
}

export function microsoftCallbackUrl(req: Request) {
  if (process.env.MICROSOFT_REDIRECT_URI) {
    return process.env.MICROSOFT_REDIRECT_URI;
  }

  const proto = (req.get("x-forwarded-proto") || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = (req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  return `${proto}://${host}/api/auth/oauth/microsoft/callback`;
}

export function defaultFrontendCallbackUrl() {
  const web =
    process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") ||
    `http://127.0.0.1:${process.env.WEB_PORT || 3000}`;
  return `${web}/auth/callback`;
}

export function resolveFrontendRedirect(redirectTo: unknown) {
  const fallback = defaultFrontendCallbackUrl();
  if (typeof redirectTo !== "string" || !redirectTo) {
    return fallback;
  }

  try {
    const url = new URL(redirectTo);
    const extraOrigins = (process.env.PUBLIC_WEB_URL || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin);
    const allowedOrigins = new Set([
      new URL(fallback).origin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      ...extraOrigins,
    ]);

    if (!allowedOrigins.has(url.origin)) {
      return fallback;
    }
    if (url.pathname !== "/auth/callback" && !url.pathname.endsWith("/auth/callback")) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

export function createOAuthState(redirectTo: string) {
  pruneStates();
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, { redirectTo, createdAt: Date.now() });
  return state;
}

export function takeOAuthState(state: string | undefined) {
  if (!state) {
    return null;
  }
  const entry = pendingStates.get(state);
  if (!entry) {
    return null;
  }
  pendingStates.delete(state);
  if (Date.now() - entry.createdAt > STATE_TTL_MS) {
    return null;
  }
  return entry;
}

export function buildAuthorizeUrl(req: Request, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: microsoftCallbackUrl(req),
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/authorize?${params.toString()}`;
}

export function frontendErrorRedirect(redirectTo: string, message: string) {
  const url = new URL(redirectTo);
  url.searchParams.set("error", message);
  return url.toString();
}

export function frontendSuccessRedirect(redirectTo: string, user: unknown) {
  const url = new URL(redirectTo);
  url.searchParams.set("auth", Buffer.from(JSON.stringify({ user }), "utf8").toString("base64url"));
  return url.toString();
}

type MicrosoftTokenResponse = {
  access_token?: string;
  error_description?: string;
};

type MicrosoftProfile = {
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
};

export async function exchangeCodeForProfile(req: Request, code: string) {
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        code,
        redirect_uri: microsoftCallbackUrl(req),
        grant_type: "authorization_code",
      }),
    },
  );
  const tokenJson = (await tokenRes.json()) as MicrosoftTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || "Microsoft token exchange failed");
  }

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const me = (await meRes.json()) as MicrosoftProfile;
  if (!meRes.ok) {
    throw new Error("Could not read your Microsoft profile");
  }

  const email = (me.mail || me.userPrincipalName || "").trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Your Microsoft account does not have an email we can use");
  }

  return {
    email,
    name: (me.displayName || email.split("@")[0]).trim(),
  };
}
