import Docker from "dockerode";
import net from "node:net";

export const docker = new Docker();

export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not determine free port")));
      }
    });
  });
}

export async function buildImage(contextPath: string, tag: string, onLog: (line: string) => void): Promise<void> {
  const stream = await docker.buildImage(
    { context: contextPath, src: ["."] },
    { t: tag }
  );

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, res) => {
        if (err) return reject(err);
        const last = res[res.length - 1];
        if (last && last.error) return reject(new Error(last.error));
        resolve();
      },
      (event) => {
        if (event.stream) onLog(event.stream.trimEnd());
        if (event.error) onLog(`ERROR: ${event.error}`);
      }
    );
  });
}

/**
 * Assumes the built image exposes an HTTP server on containerPort (default 3000) —
 * the same convention DeployLite's generated Dockerfile uses for detected apps.
 */
export async function runContainer(
  imageTag: string,
  containerName: string,
  containerPort = 3000
): Promise<{ containerId: string; hostPort: number }> {
  const hostPort = await getFreePort();

  const container = await docker.createContainer({
    Image: imageTag,
    name: containerName,
    ExposedPorts: { [`${containerPort}/tcp`]: {} },
    HostConfig: {
      PortBindings: { [`${containerPort}/tcp`]: [{ HostPort: String(hostPort) }] },
      RestartPolicy: { Name: "unless-stopped" },
    },
  });

  await container.start();

  return { containerId: container.id, hostPort };
}

export async function stopAndRemoveContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  try {
    await container.stop();
  } catch {
    // already stopped
  }
  await container.remove();
}
