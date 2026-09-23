import { useEffect, useState } from "react";
import { api } from "./api";
import type { Build, Repo } from "./types";
import { StatusBadge } from "./components/StatusBadge";
import { ConnectRepoForm } from "./components/ConnectRepoForm";
import { BuildLogPanel } from "./components/BuildLogPanel";

const ACTIVE_STATUSES = new Set(["QUEUED", "CLONING", "TESTING", "BUILDING", "DEPLOYING"]);

export default function App() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRepos = () => api.getRepos().then(setRepos).catch((e) => setError(e.message));

  useEffect(() => {
    loadRepos();
  }, []);

  useEffect(() => {
    const load = () =>
      api
        .getBuilds(selectedRepoId ?? undefined)
        .then(setBuilds)
        .catch((e) => setError(e.message));

    load();
    const hasActive = builds.some((b) => ACTIVE_STATUSES.has(b.status));
    const interval = setInterval(load, hasActive ? 2000 : 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepoId, builds.length]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>DeployLite</h1>
        <p>Push → test → build → deploy</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="layout">
        <aside className="sidebar">
          <ConnectRepoForm onConnected={loadRepos} />
          <nav className="repo-list">
            <button className={selectedRepoId === null ? "active" : ""} onClick={() => setSelectedRepoId(null)}>
              All repos
            </button>
            {repos.map((repo) => (
              <button
                key={repo.id}
                className={selectedRepoId === repo.id ? "active" : ""}
                onClick={() => setSelectedRepoId(repo.id)}
              >
                {repo.fullName}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main">
          <table className="builds-table">
            <thead>
              <tr>
                <th>Repo</th>
                <th>Branch</th>
                <th>Commit</th>
                <th>Status</th>
                <th>Deployment</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((build) => (
                <tr key={build.id} onClick={() => setSelectedBuildId(build.id)} className="build-row">
                  <td>{build.repo.fullName}</td>
                  <td>{build.branch}</td>
                  <td className="mono">{build.commitSha.slice(0, 7)}</td>
                  <td>
                    <StatusBadge status={build.status} />
                  </td>
                  <td>
                    {build.deployment ? (
                      <a href={build.deployment.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        {build.deployment.url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {builds.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No builds yet. Connect a repo and push to trigger one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      {selectedBuildId && <BuildLogPanel buildId={selectedBuildId} onClose={() => setSelectedBuildId(null)} />}
    </div>
  );
}
