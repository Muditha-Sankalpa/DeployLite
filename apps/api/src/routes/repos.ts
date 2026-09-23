import { Router } from "express";
import { prisma } from "../db/client.js";

export const reposRouter = Router();

reposRouter.get("/", async (_req, res) => {
  const repos = await prisma.repo.findMany({ orderBy: { createdAt: "desc" } });
  res.json(repos);
});

reposRouter.post("/", async (req, res) => {
  const { owner, name } = req.body as { owner?: string; name?: string };
  if (!owner || !name) {
    return res.status(400).json({ error: "owner and name are required" });
  }

  const fullName = `${owner}/${name}`;
  const cloneUrl = `https://github.com/${fullName}.git`;

  const repo = await prisma.repo.upsert({
    where: { fullName },
    update: {},
    create: { owner, name, fullName, cloneUrl },
  });

  res.status(201).json(repo);
});
