import "dotenv/config";
import express from "express";
import cors from "cors";
import { reposRouter } from "./routes/repos.js";
import { buildsRouter } from "./routes/builds.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/webhooks", webhooksRouter);
app.use("/repos", reposRouter);
app.use("/builds", buildsRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`DeployLite API listening on http://localhost:${port}`);
});
