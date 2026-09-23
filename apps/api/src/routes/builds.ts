import { Router } from "express";
import { prisma } from "../db/client.js";

export const buildsRouter = Router();

buildsRouter.get("/", async (req, res) => {
  const { repoId } = req.query as { repoId?: string };
  const builds = await prisma.build.findMany({
    where: repoId ? { repoId } : undefined,
    include: { repo: true, deployment: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(builds);
});

buildsRouter.get("/:id", async (req, res) => {
  const build = await prisma.build.findUnique({
    where: { id: req.params.id },
    include: { repo: true, deployment: true },
  });
  if (!build) return res.status(404).json({ error: "Build not found" });
  res.json(build);
});

buildsRouter.get("/:id/logs", async (req, res) => {
  const build = await prisma.build.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, logs: true },
  });
  if (!build) return res.status(404).json({ error: "Build not found" });
  res.json(build);
});
