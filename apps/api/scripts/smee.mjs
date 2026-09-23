// Forwards webhook deliveries from a smee.io channel to the local DeployLite API,
// so a real GitHub webhook can reach localhost during development.
//
// Usage: SMEE_URL=https://smee.io/<channel> node scripts/smee.mjs
import SmeeClient from "smee-client";
import "dotenv/config";

const source = process.env.SMEE_URL;
if (!source) {
  console.error("Set SMEE_URL to your smee.io channel (see README > Real GitHub webhooks)");
  process.exit(1);
}

const target = `http://localhost:${process.env.PORT ?? 4000}/webhooks/github`;

const client = new SmeeClient({
  source,
  target,
  logger: console,
});

const events = client.start();

process.on("SIGINT", () => {
  events.close();
  process.exit(0);
});
