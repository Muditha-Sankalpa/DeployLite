import type { Build, Repo } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getRepos: () => request<Repo[]>("/repos"),
  createRepo: (owner: string, name: string) =>
    request<Repo>("/repos", { method: "POST", body: JSON.stringify({ owner, name }) }),
  getBuilds: (repoId?: string) => request<Build[]>(`/builds${repoId ? `?repoId=${repoId}` : ""}`),
  getBuild: (id: string) => request<Build>(`/builds/${id}`),
};
