"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    if (r.ok) {
      router.push(next);
      router.refresh();
      return;
    }
    setError("Token inválido.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <Field label="Token de operador">
        <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="current-password" required minLength={12} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-rock">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
