import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { simpleGit } from "simple-git";
import { prisma } from "../db/client.js";
import { buildImage, runContainer, stopAndRemoveContainer } from "./docker.js";
import type { BuildJobData } from "../queue/queue.js";
import type { BuildStatus } from "@prisma/client";

const WORKDIR_ROOT = path.join(os.tmpdir(), "deploylite-builds");

const DEFAULT_DOCKERFILE = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev || npm install
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
`;

class BuildFailedError extends Error {}

async function appendLog(buildId: string, line: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "Build" SET logs = logs || $1 WHERE id = $2`,
    line + "\n",
    buildId
  );
}

async function setStatus(buildId: string, status: BuildStatus, extra: Record<string, unknown> = {}): Promise<void> {
  await prisma.build.update({ where: { id: buildId }, data: { status, ...extra } });
}

function runCommand(cmd: string, args: string[], cwd: string, onLog: (line: string) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === "win32" });

    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) onLog(line);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) onLog(line);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function hasTestScript(repoDir: string): Promise<boolean> {
  try {
    const pkgRaw = await fs.readFile(path.join(repoDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    return Boolean(pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1');
  } catch {
    return false;
  }
}

async function ensureDockerfile(repoDir: string): Promise<void> {
  const dockerfilePath = path.join(repoDir, "Dockerfile");
  try {
    await fs.access(dockerfilePath);
  } catch {
    await fs.writeFile(dockerfilePath, DEFAULT_DOCKERFILE, "utf-8");
  }
}

export async function runBuild(job: BuildJobData, onLog: (line: string) => void): Promise<void> {
  const repoDir = path.join(WORKDIR_ROOT, job.buildId);
  await fs.mkdir(WORKDIR_ROOT, { recursive: true });

  const log = async (line: string) => {
    onLog(line);
    await appendLog(job.buildId, line);
  };

  try {
    await setStatus(job.buildId, "CLONING", { startedAt: new Date() });
    await log(`Cloning ${job.cloneUrl} @ ${job.commitSha}`);

    const git = simpleGit();
    await git.clone(job.cloneUrl, repoDir, ["--branch", job.branch, "--single-branch"]);
    await git.cwd(repoDir).checkout(job.commitSha);
    await log("Repository cloned");

    await setStatus(job.buildId, "TESTING");
    if (await hasTestScript(repoDir)) {
      await log("Installing dependencies");
      const installCode = await runCommand("npm", ["install"], repoDir, (l) => void log(l));
      if (installCode !== 0) throw new BuildFailedError("npm install failed");

      await log("Running tests");
      const testCode = await runCommand("npm", ["test"], repoDir, (l) => void log(l));
      if (testCode !== 0) throw new BuildFailedError("Tests failed");
      await log("Tests passed");
    } else {
      await log("No test script found, skipping tests");
    }

    await setStatus(job.buildId, "BUILDING");
    await ensureDockerfile(repoDir);
    const imageTag = `deploylite/${job.repoId}:${job.buildId}`;
    await log(`Building Docker image ${imageTag}`);
    await buildImage(repoDir, imageTag, (l) => void log(l));
    await log("Docker image built");

    await setStatus(job.buildId, "DEPLOYING");

    const previousDeployment = await prisma.deployment.findFirst({
      where: { build: { repoId: job.repoId }, status: "RUNNING" },
      orderBy: { createdAt: "desc" },
    });
    if (previousDeployment) {
      await log(`Stopping previous deployment ${previousDeployment.containerId}`);
      await stopAndRemoveContainer(previousDeployment.containerId).catch(() => {});
      await prisma.deployment.update({ where: { id: previousDeployment.id }, data: { status: "STOPPED" } });
    }

    const containerName = `deploylite-${job.repoId}-${job.buildId}`;
    const { containerId, hostPort } = await runContainer(imageTag, containerName);
    const url = `${process.env.DEPLOYMENT_HOST ?? "http://localhost"}:${hostPort}`;

    await prisma.deployment.create({
      data: { buildId: job.buildId, url, containerId, port: hostPort, status: "RUNNING" },
    });

    await log(`Deployment successful: ${url}`);
    await setStatus(job.buildId, "SUCCESS", { finishedAt: new Date() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log(`Build failed: ${message}`);
    await setStatus(job.buildId, "FAILED", { finishedAt: new Date(), errorMessage: message });
    throw err;
  } finally {
    await fs.rm(repoDir, { recursive: true, force: true }).catch(() => {});
  }
}
