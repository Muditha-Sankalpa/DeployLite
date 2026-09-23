import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Build } from "../types";
import { StatusBadge } from "./StatusBadge";

const TERMINAL_STATUSES = new Set(["SUCCESS", "FAILED"]);

export function BuildLogPanel({ buildId, onClose }: { buildId: string; onClose: () => void }) {
  const [build, setBuild] = useState<Build | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await api.getBuild(buildId);
      if (cancelled) return;
      setBuild(data);
    };

    load();
    const interval = setInterval(() => {
      if (build && TERMINAL_STATUSES.has(build.status)) return;
      load();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildId, build?.status]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [build?.logs]);

  return (
    <div className="log-panel-overlay" onClick={onClose}>
      <div className="log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="log-panel-header">
          <div>
            <strong>{build?.repo.fullName}</strong>{" "}
            <span className="mono">{build?.commitSha.slice(0, 7)}</span>
            {build && <StatusBadge status={build.status} />}
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <pre className="log-output" ref={logRef}>
          {build?.logs || "Waiting for logs..."}
        </pre>
        {build?.deployment && (
          <div className="log-panel-footer">
            Deployed to{" "}
            <a href={build.deployment.url} target="_blank" rel="noreferrer">
              {build.deployment.url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
