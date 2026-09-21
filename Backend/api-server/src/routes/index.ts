import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import milestonesRouter from "./milestones";
import vendorsRouter from "./vendors";
import vendorInvitesRouter from "./vendor-invites";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import operationsRouter from "./operations";
import kpisRouter from "./kpis";
import cronRouter from "./cron";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(milestonesRouter);
router.use(vendorsRouter);
router.use(vendorInvitesRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(operationsRouter);
router.use(kpisRouter);
router.use(cronRouter);

export default router;
