import { Router } from "express";
import { prisma } from "../db/client.js";
import { buildQueue } from "../queue/queue.js";
import { verifyGithubSignature, parseBranch, type GithubPushPayload } from "../services/github.js";

export const webhooksRouter = Router();

webhooksRouter.post("/github", async (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const signature = req.header("x-hub-signature-256");
  if (!rawBody || !verifyGithubSignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.header("x-github-event");
  if (event === "ping") {
    return res.status(200).json({ ok: true });
  }
  if (event !== "push") {
    return res.status(202).json({ ignored: true, event });
  }

  const payload = req.body as GithubPushPayload;
  const fullName = payload.repository.full_name;

  const repo = await prisma.repo.findUnique({ where: { fullName } });
  if (!repo) {
    return res.status(404).json({ error: `Repo ${fullName} is not registered with DeployLite` });
  }

  const build = await prisma.build.create({
    data: {
      repoId: repo.id,
      commitSha: payload.after,
      branch: parseBranch(payload.ref),
      status: "QUEUED",
    },
  });

  await buildQueue.add("build", {
    buildId: build.id,
    repoId: repo.id,
    cloneUrl: repo.cloneUrl,
    commitSha: build.commitSha,
    branch: build.branch,
  });

  res.status(202).json({ buildId: build.id });
});
