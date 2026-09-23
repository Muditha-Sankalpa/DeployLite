import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export interface BuildJobData {
  buildId: string;
  repoId: string;
  cloneUrl: string;
  commitSha: string;
  branch: string;
}

export const buildQueue = new Queue<BuildJobData>("builds", { connection });
