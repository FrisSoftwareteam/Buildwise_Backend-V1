import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { sendVendorMilestoneMails } from "../lib/milestone-overdue";

const router: IRouter = Router();

function cronAuthorized(req: { get: (name: string) => string | undefined; query: Record<string, unknown> }) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.get("authorization") || "";
  const query = typeof req.query.secret === "string" ? req.query.secret : "";
  if (secret) {
    return header === `Bearer ${secret}` || query === secret;
  }
  return req.get("x-vercel-cron") === "1";
}

async function runCron(req: import("express").Request, res: import("express").Response) {
  if (!cronAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized cron request" });
  }
  try {
    const result = await sendVendorMilestoneMails();
    return res.json({ ok: true, ...result });
  } catch (error) {
    logger.error({ err: error }, "Vendor milestone cron failed");
    return res.status(500).json({ error: "Failed to send vendor milestone mails" });
  }
}

router.get("/cron/vendor-milestone-mails", runCron);
router.post("/cron/vendor-milestone-mails", runCron);

export default router;
