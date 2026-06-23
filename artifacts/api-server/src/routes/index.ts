import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clubsRouter from "./clubs";
import membersRouter from "./members";
import attendanceRouter from "./attendance";
import newsRouter from "./news";
import reportsRouter from "./reports";
import pushRouter from "./push";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clubsRouter);
router.use(membersRouter);
router.use(attendanceRouter);
router.use(newsRouter);
router.use(reportsRouter);
router.use(pushRouter);
router.use(uploadRouter);

export default router;
