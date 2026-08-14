import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import vendorsRouter from "./vendors";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import operationsRouter from "./operations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(vendorsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(operationsRouter);

export default router;
