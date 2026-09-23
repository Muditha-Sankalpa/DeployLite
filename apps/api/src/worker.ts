import "dotenv/config";
import { Worker } from "bullmq";
import { connection, type BuildJobData } from "./queue/queue.js";
import { runBuild } from "./services/buildRunner.js";

const worker = new Worker<BuildJobData>(
  "builds",
  async (job) => {
    console.log(`[worker] starting build ${job.data.buildId} for repo ${job.data.repoId}`);
    await runBuild(job.data, (line) => console.log(`[build ${job.data.buildId}] ${line}`));
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job) => {
  console.log(`[worker] build ${job.data.buildId} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] build ${job?.data.buildId} failed: ${err.message}`);
});

console.log("DeployLite worker started, waiting for build jobs...");
