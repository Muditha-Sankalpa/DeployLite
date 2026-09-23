import crypto from "node:crypto";

/**
 * GitHub signs the webhook payload with HMAC-SHA256 using the configured secret.
 * Constant-time comparison avoids leaking the signature via timing.
 */
export function verifyGithubSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface GithubPushPayload {
  ref: string;
  after: string;
  repository: {
    full_name: string;
    name: string;
    owner: { login: string };
    clone_url: string;
  };
}

export function parseBranch(ref: string): string {
  return ref.replace("refs/heads/", "");
}
