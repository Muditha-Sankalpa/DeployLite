export interface Repo {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  cloneUrl: string;
  createdAt: string;
}

export type BuildStatus = "QUEUED" | "CLONING" | "TESTING" | "BUILDING" | "DEPLOYING" | "SUCCESS" | "FAILED";

export interface Deployment {
  id: string;
  url: string;
  status: "RUNNING" | "STOPPED" | "FAILED";
  port: number;
}

export interface Build {
  id: string;
  repoId: string;
  repo: Repo;
  commitSha: string;
  branch: string;
  status: BuildStatus;
  logs: string;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  deployment: Deployment | null;
}
