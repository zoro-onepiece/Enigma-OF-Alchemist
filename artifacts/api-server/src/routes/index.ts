import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mintRouter from "./nft/mint";
import puzzleVerifyRouter from "./puzzle/verify";
import authSessionRouter from "./auth/session";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/nft/mint", mintRouter);
router.use("/puzzle/verify", puzzleVerifyRouter);
router.use("/auth/session", authSessionRouter);

export default router;
