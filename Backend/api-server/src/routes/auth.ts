import { Router, type IRouter } from "express";
import { createUser, getUserByEmail, sanitizeUser } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  buildAuthorizeUrl,
  createOAuthState,
  defaultFrontendCallbackUrl,
  exchangeCodeForProfile,
  frontendErrorRedirect,
  frontendSuccessRedirect,
  isMicrosoftOAuthConfigured,
  resolveFrontendRedirect,
  takeOAuthState,
} from "../lib/microsoft-oauth";

const router: IRouter = Router();

router.get("/auth/providers", (_req, res) => {
  // Google sign-in is intentionally disabled: BuildWise accounts are
  // provisioned through the First Registrars Microsoft tenant only.
  return res.json({
    google: false,
    microsoft: isMicrosoftOAuthConfigured(),
  });
});

router.get("/auth/oauth/microsoft/start", (req, res) => {
  const redirectTo = resolveFrontendRedirect(req.query.redirectTo);
  if (!isMicrosoftOAuthConfigured()) {
    return res.redirect(
      frontendErrorRedirect(
        redirectTo,
        "Microsoft sign-in is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to the API environment.",
      ),
    );
  }

  const state = createOAuthState(redirectTo);
  return res.redirect(buildAuthorizeUrl(req, state));
});

router.get("/auth/oauth/microsoft/callback", async (req, res) => {
  const stateRecord = takeOAuthState(typeof req.query.state === "string" ? req.query.state : undefined);
  const redirectTo = stateRecord?.redirectTo || defaultFrontendCallbackUrl();

  try {
    if (req.query.error) {
      const description =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : String(req.query.error);
      return res.redirect(frontendErrorRedirect(redirectTo, description));
    }

    if (!stateRecord) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Microsoft sign-in expired. Please try again."),
      );
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Microsoft did not return an authorization code."),
      );
    }

    const profile = await exchangeCodeForProfile(req, code);
    let user = await getUserByEmail(profile.email);
    if (!user) {
      user = await createUser({
        name: profile.name,
        email: profile.email,
        role: "developer",
        department: "Engineering",
      });
    }

    return res.redirect(frontendSuccessRedirect(redirectTo, sanitizeUser(user)));
  } catch (e) {
    logger.error({ err: e }, "Microsoft OAuth failed");
    return res.redirect(
      frontendErrorRedirect(redirectTo, "Microsoft sign-in failed. Please try again."),
    );
  }
});

router.post("/auth/login", async (_req, res) => {
  // Password sign-in is disabled: BuildWise accounts sign in exclusively
  // through the First Registrars Microsoft tenant (see /auth/oauth/microsoft/start).
  return res.status(403).json({
    error: "Password sign-in is disabled. Sign in with your First Registrars Microsoft account.",
  });
});

router.post("/auth/signup", async (_req, res) => {
  // Self-service signup is disabled: BuildWise accounts are provisioned
  // automatically on first Microsoft sign-in (see /auth/oauth/microsoft/callback).
  return res.status(403).json({
    error: "Self-service signup is disabled. Sign in with your First Registrars Microsoft account.",
  });
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
