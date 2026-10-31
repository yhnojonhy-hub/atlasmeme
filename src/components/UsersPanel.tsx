"use client";

import { useEffect, useState } from "react";
import type { PublicUser } from "@/lib/users";
import { Field, Pill } from "./ui";

export function UsersPanel({ meId }: { meId: string }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operador">("operador");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/api/users")
      .then(async (r) => r.ok && setUsers((await r.json()).users))
      .catch(() => undefined);
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, name, password, role }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Erro");
    setEmail("");
    setName("");
    setPassword("");
    setMsg("Usuário criado. Ele deve trocar a senha no primeiro acesso.");
    load();
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Remover ${label}?`)) return;
    const r = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const j = await r.json();
    setMsg(r.ok ? "Removido." : (j.error ?? "Erro"));
    load();
  }

  async function setRoleOf(id: string, next: "admin" | "operador") {
    const r = await fetch("/api/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, role: next }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Erro");
    load();
  }

  async function resetPassword(id: string, label: string) {
    const pw = prompt(`Nova senha temporária para ${label} (mín. 10 caracteres):`);
    if (!pw) return;
    const r = await fetch("/api/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, password: pw }) });
    const j = await r.json();
    setMsg(r.ok ? "Senha redefinida." : (j.error ?? "Erro"));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Último acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-mist">{u.email}</div>
                </td>
                <td>
                  <select className="input py-1 text-sm" value={u.role} disabled={u.id === meId} onChange={(e) => setRoleOf(u.id, e.target.value as "admin" | "operador")}>
                    <option value="admin">admin</option>
                    <option value="operador">operador</option>
                  </select>
                  {u.mustChangePassword && (
                    <div className="mt-1">
                      <Pill tone="beam">senha provisória</Pill>
                    </div>
                  )}
                </td>
                <td className="text-xs text-mist">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "nunca"}</td>
                <td className="text-right whitespace-nowrap">
                  <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => resetPassword(u.id, u.email)}>
                    Redefinir senha
                  </button>{" "}
                  {u.id !== meId && (
                    <button className="btn btn-ghost px-2 py-1 text-xs text-rock" onClick={() => remove(u.id, u.email)}>
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="card space-y-3 p-4">
        <h3 className="font-semibold">Novo usuário</h3>
        <Field label="E-mail">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Nome">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Senha provisória" hint="mín. 10 caracteres; o usuário troca no 1º acesso">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" />
        </Field>
        <Field label="Papel">
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as "admin" | "operador")}>
            <option value="operador">operador — opera projetos</option>
            <option value="admin">admin — vê tudo, financeiro e usuários</option>
          </select>
        </Field>
        <button className="btn btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Criando…" : "Criar usuário"}
        </button>
        {msg && <p className="text-xs text-ink-soft">{msg}</p>}
      </form>
    </div>
  );
}
