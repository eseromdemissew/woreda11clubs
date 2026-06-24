import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// FIX 1: Use this import style to fix the "not callable" error
import pinoHttp = require("pino-http"); 
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      // FIX 2: Explicitly type 'req' as 'any'
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      // FIX 3: Explicitly type 'res' as 'any'
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
