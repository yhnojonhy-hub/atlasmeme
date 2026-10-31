"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ROLE_LABEL, type ProjectInput } from "@/lib/projects/schema";
import { Alert, Field } from "./ui";

type Wallet = { address: string; role: keyof typeof ROLE_LABEL; label: string; evidenceUrl: string };
type Alloc = { name: string; pct: number; vesting: string };

const STEPS = ["Identidade", "Token e canais", "Carteiras e oferta", "Políticas e publicação"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ticker, setTicker] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [accent, setAccent] = useState("#F2B134");

  const [mint, setMint] = useState("");
  const [launchpad, setLaunchpad] = useState<ProjectInput["launchpad"]>("nenhum");
  const [stage, setStage] = useState<NonNullable<ProjectInput["stage"]>>("descoberta");
  const [links, setLinks] = useState({ site: "", x: "", telegram: "", discord: "" });

  const [wallets, setWallets] = useState<Wallet[]>([{ address: "", role: "tesouraria", label: "", evidenceUrl: "" }]);
  const [total, setTotal] = useState(1_000_000_000);
  const [allocs, setAllocs] = useState<Alloc[]>([
    { name: "Curva / mercado", pct: 80, vesting: "" },
    { name: "Tesouraria da comunidade", pct: 10, vesting: "" },
    { name: "Equipe", pct: 10, vesting: "" },
  ]);

  const [policies, setPolicies] = useState({
    mintAuthority: "nao-informada" as "revogada" | "ativa" | "nao-informada",
    freezeAuthority: "nao-informada" as "revogada" | "ativa" | "nao-informada",
    liquidity: "",
    teamSales: "",
    feesUse: "",
  });

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const pctSum = useMemo(() => allocs.reduce((s, a) => s + (Number(a.pct) || 0), 0), [allocs]);

  function next() {
    setError(null);
    if (step === 0) {
      if (name.trim().length < 2) return setError("Dê um nome ao projeto.");
      if (!/^[a-z0-9-]{3,40}$/.test(effectiveSlug)) return setError("Endereço: 3 a 40 caracteres, letras minúsculas, números e hífen.");
      if (!ticker.trim()) return setError("Informe o ticker.");
    }
    if (step === 2 && pctSum !== 100) return setError(`As alocações somam ${pctSum}%. Precisam somar 100%.`);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function publish() {
    setBusy(true);
    setError(null);
    const body: ProjectInput = {
      slug: effectiveSlug,
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      tagline,
      about,
      accent,
      stage,
      network: "solana",
      mint: mint.trim(),
      launchpad,
      links,
      wallets: wallets
        .filter((w) => w.address.trim())
        .map((w) => ({ ...w, address: w.address.trim() })),
      supply: { total, allocations: allocs.map((a) => ({ ...a, pct: Number(a.pct) })) },
      policies,
    };
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) {
        const issue = j.issues?.[0];
        throw new Error(issue ? `${issue.path?.join(".")}: ${issue.message}` : j.error ?? "Não foi possível publicar.");
      }
      router.push(`/p/${j.project.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Passos">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${i === step ? "bg-ink text-foam" : i < step ? "bg-tide-soft text-tide" : "bg-foam-2 text-mist"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nome do projeto">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Baía Azul" />
          </Field>
          <Field label="Endereço do site" hint={`/p/${effectiveSlug || "..."}`}>
            <input
              className="input"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Ticker">
            <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} maxLength={12} placeholder="BAIA" />
          </Field>
          <Field label="Cor de destaque">
            <input className="input h-11" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </Field>
          <Field label="Frase curta" hint="o que é, em uma linha; sem promessa de preço">
            <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={140} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Sobre" hint="texto factual: tema, quem está por trás, o que a comunidade faz">
              <textarea className="input min-h-28" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={2000} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Etapa atual">
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}>
              <option value="descoberta">Descoberta</option>
              <option value="comunidade">Comunidade sem token</option>
              <option value="ensaio">Ensaio técnico</option>
              <option value="lancado">Lançado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
          <Field label="Plataforma de lançamento">
            <select className="input" value={launchpad} onChange={(e) => setLaunchpad(e.target.value as typeof launchpad)}>
              <option value="nenhum">Ainda não definida</option>
              <option value="pump.fun">Pump.fun</option>
              <option value="raydium-launchlab">Raydium LaunchLab</option>
              <option value="outro">Outra</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Mint (opcional agora)" hint="adicione depois do lançamento; o site passa a ler mercado e autoridades ao vivo">
              <input className="input mono" value={mint} onChange={(e) => setMint(e.target.value.trim())} placeholder="EPjF…" spellCheck={false} />
            </Field>
          </div>
          {(["site", "x", "telegram", "discord"] as const).map((k) => (
            <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} hint="URL completa">
              <input className="input" value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder="https://" />
            </Field>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Carteiras controladas pela equipe</h3>
              <button className="btn btn-ghost text-sm" type="button" onClick={() => setWallets([...wallets, { address: "", role: "equipe", label: "", evidenceUrl: "" }])}>
                Adicionar carteira
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-soft">Toda carteira que a equipe controla entra aqui, com função. É o que permite a alguém de fora confiar.</p>
            <div className="mt-4 space-y-3">
              {wallets.map((w, i) => (
                <div key={i} className="grid gap-2 rounded-lg bg-foam p-3 sm:grid-cols-[1fr_160px_1fr_1fr_auto]">
                  <input className="input mono" placeholder="Endereço" value={w.address} onChange={(e) => setWallets(wallets.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} spellCheck={false} />
                  <select className="input" value={w.role} onChange={(e) => setWallets(wallets.map((x, j) => (j === i ? { ...x, role: e.target.value as Wallet["role"] } : x)))}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input className="input" placeholder="Rótulo (ex.: multisig Squads)" value={w.label} onChange={(e) => setWallets(wallets.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="input" placeholder="Evidência (URL)" value={w.evidenceUrl} onChange={(e) => setWallets(wallets.map((x, j) => (j === i ? { ...x, evidenceUrl: e.target.value } : x)))} />
                  <button className="btn btn-ghost text-sm" type="button" onClick={() => setWallets(wallets.filter((_, j) => j !== i))} aria-label="Remover">
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Oferta e alocações</h3>
              <span className={`pill ${pctSum === 100 ? "bg-ok-soft text-ok" : "bg-rock-soft text-rock"}`}>{pctSum}%</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Oferta total">
                <input className="input num" type="number" min={1} value={total} onChange={(e) => setTotal(Number(e.target.value))} />
              </Field>
            </div>
            <div className="mt-3 space-y-2">
              {allocs.map((a, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_110px_1.4fr_auto]">
                  <input className="input" value={a.name} onChange={(e) => setAllocs(allocs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="input num" type="number" min={0} max={100} value={a.pct} onChange={(e) => setAllocs(allocs.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />
                  <input className="input" placeholder="Bloqueio / vesting" value={a.vesting} onChange={(e) => setAllocs(allocs.map((x, j) => (j === i ? { ...x, vesting: e.target.value } : x)))} />
                  <button className="btn btn-ghost text-sm" type="button" onClick={() => setAllocs(allocs.filter((_, j) => j !== i))}>
                    Remover
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost text-sm" type="button" onClick={() => setAllocs([...allocs, { name: "", pct: 0, vesting: "" }])}>
                Adicionar alocação
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Autoridade de emissão">
              <select className="input" value={policies.mintAuthority} onChange={(e) => setPolicies({ ...policies, mintAuthority: e.target.value as typeof policies.mintAuthority })}>
                <option value="nao-informada">Não informada</option>
                <option value="revogada">Revogada</option>
                <option value="ativa">Ativa</option>
              </select>
            </Field>
            <Field label="Autoridade de congelamento">
              <select className="input" value={policies.freezeAuthority} onChange={(e) => setPolicies({ ...policies, freezeAuthority: e.target.value as typeof policies.freezeAuthority })}>
                <option value="nao-informada">Não informada</option>
                <option value="revogada">Revogada</option>
                <option value="ativa">Ativa</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Política de liquidez" hint="onde está, se a LP é queimada ou bloqueada, quem pode mexer">
                <textarea className="input min-h-20" value={policies.liquidity} onChange={(e) => setPolicies({ ...policies, liquidity: e.target.value })} maxLength={400} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Vendas da equipe" hint="calendário, aviso prévio, limites">
                <textarea className="input min-h-20" value={policies.teamSales} onChange={(e) => setPolicies({ ...policies, teamSales: e.target.value })} maxLength={400} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Uso das taxas do criador" hint="cadência de claim e destino">
                <textarea className="input min-h-20" value={policies.feesUse} onChange={(e) => setPolicies({ ...policies, feesUse: e.target.value })} maxLength={400} />
              </Field>
            </div>
          </div>
          <Alert tone="info">
            Ao publicar, o site mostra automaticamente os avisos padrão: a equipe tem posição e recebe taxas; não há promessa de
            valorização; market cap não é caixa. Eles podem ser editados depois, nunca removidos.
          </Alert>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-rock">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button className="btn btn-ghost" type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Voltar
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" type="button" onClick={next}>
            Continuar
          </button>
        ) : (
          <button className="btn btn-beam" type="button" onClick={publish} disabled={busy}>
            {busy ? "Publicando…" : "Publicar site"}
          </button>
        )}
      </div>
    </div>
  );
}
