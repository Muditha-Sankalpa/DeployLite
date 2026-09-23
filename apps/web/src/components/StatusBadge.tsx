import type { BuildStatus } from "../types";

const COLORS: Record<BuildStatus, string> = {
  QUEUED: "#6b7280",
  CLONING: "#3b82f6",
  TESTING: "#3b82f6",
  BUILDING: "#3b82f6",
  DEPLOYING: "#3b82f6",
  SUCCESS: "#16a34a",
  FAILED: "#dc2626",
};

export function StatusBadge({ status }: { status: BuildStatus }) {
  return (
    <span className="status-badge" style={{ backgroundColor: COLORS[status] }}>
      {status}
    </span>
  );
}
