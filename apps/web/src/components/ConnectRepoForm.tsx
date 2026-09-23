import { useState, type FormEvent } from "react";
import { api } from "../api";

export function ConnectRepoForm({ onConnected }: { onConnected: () => void }) {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!owner || !name) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createRepo(owner.trim(), name.trim());
      setOwner("");
      setName("");
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect repo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="connect-form" onSubmit={handleSubmit}>
      <label>Connect a repo</label>
      <input placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
      <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" disabled={submitting}>
        {submitting ? "Connecting..." : "Connect"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
