// Simulates a GitHub "push" webhook against a locally running DeployLite API,
// so the full pipeline can be tested before wiring up a real GitHub webhook
// (which needs a public URL, e.g. via smee.io or ngrok, to reach localhost).
//
// Usage: node scripts/simulate-push.mjs <owner> <name> [commitSha] [branch]
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import "dotenv/config";

const execFileAsync = promisify(execFile);

const [, , owner, name, commitShaArg, branch = "main"] = process.argv;

if (!owner || !name) {
  console.error("Usage: node scripts/simulate-push.mjs <owner> <name> [commitSha] [branch]");
  process.exit(1);
}

async function resolveLatestSha(cloneUrl, branch) {
  const { stdout } = await execFileAsync("git", ["ls-remote", cloneUrl, `refs/heads/${branch}`]);
  const sha = stdout.split(/\s+/)[0];
  if (!sha) throw new Error(`Could not resolve HEAD of ${branch} on ${cloneUrl}`);
  return sha;
}

const cloneUrl = `https://github.com/${owner}/${name}.git`;
const commitSha = commitShaArg ?? (await resolveLatestSha(cloneUrl, branch));

const secret = process.env.GITHUB_WEBHOOK_SECRET;
if (!secret) {
  console.error("GITHUB_WEBHOOK_SECRET is not set (check apps/api/.env)");
  process.exit(1);
}

const payload = {
  ref: `refs/heads/${branch}`,
  after: commitSha,
  repository: {
    full_name: `${owner}/${name}`,
    name,
    owner: { login: owner },
    clone_url: `https://github.com/${owner}/${name}.git`,
  },
};

const body = JSON.stringify(payload);
const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
// smee.io channels only accept POSTs at their root URL, not a sub-path.
const targetUrl = apiUrl.includes("smee.io") ? apiUrl : `${apiUrl}/webhooks/github`;

const res = await fetch(targetUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-github-event": "push",
    "x-hub-signature-256": signature,
  },
  body,
});

const text = await res.text();
try {
  console.log(res.status, JSON.parse(text));
} catch {
  console.log(res.status, text.slice(0, 200));
}
if (apiUrl.includes("smee.io")) {
  console.log("Posted to smee channel — check the smee forwarder's terminal for the relayed result.");
}
