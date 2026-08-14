import { Router, type IRouter } from "express";
import { createUser, getUserByEmail, sanitizeUser, verifyUserPassword } from "@workspace/db";
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
  return res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: true,
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

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isPasswordValid = await verifyUserPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Login failed");
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const user = await createUser({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "developer",
      department: department || "Engineering",
    });
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Signup failed");
    return res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
