"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "./ui";

export function PasswordForm({ next }: { next?: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nextPw !== confirm) return setMsg({ ok: false, text: "A confirmação não confere." });
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current, next: nextPw }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? "Erro" });
    setMsg({ ok: true, text: "Senha trocada." });
    setCurrent("");
    setNextPw("");
    setConfirm("");
    router.refresh();
    if (next) router.push(next);
  }

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-5">
      <Field label="Senha atual">
        <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </Field>
      <Field label="Nova senha" hint="mínimo 10 caracteres; use uma frase longa">
        <input className="input" type="password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirmar nova senha">
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={10} />
      </Field>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ok" : "text-rock"}`}>
          {msg.text}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Salvando…" : "Trocar senha"}
      </button>
    </form>
  );
}
