"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { Alert, Field } from "./ui";

/**
 * Brief mínimo → pipeline completo. Três campos obrigatórios (nome, ticker, tema);
 * o resto tem padrão de mercado e pode ser ajustado em "Ajustes".
 */
export function StartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [theme, setTheme] = useState("");
  const [about, setAbout] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [feeBps, setFeeBps] = useState(200);
  const [creatorShare, setCreatorShare] = useState(50);
  const [initialMcap, setInitialMcap] = useState(30);
  const [migrationMcap, setMigrationMcap] = useState(400);
  const [teamPct, setTeamPct] = useState(0);
  const [vesting, setVesting] = useState(12);
  const [ownDomain, setOwnDomain] = useState(true);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = feeBps / 10_000;
  const team = fee * 0.8;
  const perMillion = useMemo(() => team * 1_000_000, [team]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ticker: ticker.trim(),
          theme: theme.trim(),
          about,
          links: { x, telegram, discord: "" },
          tradingFeeBps: feeBps,
          creatorSharePct: creatorShare,
          initialMarketCapSol: initialMcap,
          migrationMarketCapSol: migrationMcap,
          teamAllocationPct: teamPct,
          teamVestingMonths: vesting,
          wantOwnDomain: ownDomain,
          autoLaunch,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const issue = j.issues?.[0];
        throw new Error(issue ? `${issue.path?.join(".")}: ${issue.message}` : j.error ?? "Não foi possível iniciar.");
      }
      router.push(`/app/iniciar/${j.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nome do projeto">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maré Alta" required minLength={2} maxLength={60} />
        </Field>
        <Field label="Ticker">
          <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="MARE" required maxLength={12} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Tema em uma linha" hint="o que é e para quem; vira a frase do site e do anúncio. Sem promessa de preço.">
            <input className="input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Comunidade de surfistas que publica o que faz, toda semana." required minLength={3} maxLength={140} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Sobre (opcional)" hint="texto factual: quem está por trás, o que a comunidade faz">
            <textarea className="input min-h-24" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={2000} />
          </Field>
        </div>
        <Field label="Conta oficial no X (URL, opcional)">
          <input className="input" value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/..." />
        </Field>
        <Field label="Telegram (URL, opcional)">
          <input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/..." />
        </Field>
      </div>

      <button type="button" className="btn btn-ghost text-sm" onClick={() => setAdvanced((v) => !v)}>
        {advanced ? "Ocultar ajustes" : "Ajustes da curva, equipe e domínio"}
      </button>

      {advanced && (
        <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Taxa por negociação" hint={`${fmt.pct(fee)} — padrão do mercado em Meteora DBC: 2%`}>
            <input className="input num" type="number" min={10} max={1000} step={10} value={feeBps} onChange={(e) => setFeeBps(Number(e.target.value))} />
          </Field>
          <Field label="Parte da operação (%)" hint="do que sobra após a Meteora (20%); o resto vai à tesouraria">
            <input className="input num" type="number" min={0} max={100} step={5} value={creatorShare} onChange={(e) => setCreatorShare(Number(e.target.value))} />
          </Field>
          <Field label="Market cap inicial (SOL)">
            <input className="input num" type="number" min={1} value={initialMcap} onChange={(e) => setInitialMcap(Number(e.target.value))} />
          </Field>
          <Field label="Market cap de graduação (SOL)" hint="ao atingir, a liquidez migra para DAMM v2 e trava">
            <input className="input num" type="number" min={10} value={migrationMcap} onChange={(e) => setMigrationMcap(Number(e.target.value))} />
          </Field>
          <Field label="Alocação da equipe (%)" hint="0 = sem alocação (como o H081). Máx. 20%, sempre com vesting.">
            <input className="input num" type="number" min={0} max={20} step={1} value={teamPct} onChange={(e) => setTeamPct(Number(e.target.value))} />
          </Field>
          <Field label="Vesting da equipe (meses)">
            <input className="input num" type="number" min={0} max={48} value={vesting} onChange={(e) => setVesting(Number(e.target.value))} disabled={teamPct === 0} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={ownDomain} onChange={(e) => setOwnDomain(e.target.checked)} />
            Registrar domínio próprio .xyz (até o limite configurado; sem chaves Porkbun, fica no subdomínio)
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={autoLaunch} onChange={(e) => setAutoLaunch(e.target.checked)} />
            Lançar on-chain sem pedir confirmação (ainda exige FAROL_LAUNCH_ENABLED e SOL na carteira de operação)
          </label>
        </div>
      )}

      <Alert tone="info">
        A cada US$ 1 milhão negociado, o projeto recebe <strong>{fmt.usd(perMillion)}</strong> em taxas (operação + tesouraria), reclamáveis a qualquer momento.
        Liquidez 100% travada após a graduação; autoridades de emissão e congelamento revogadas; carteiras da equipe declaradas no site.
      </Alert>

      {error && (
        <p role="alert" className="text-sm text-rock">
          {error}
        </p>
      )}

      <button className="btn btn-beam w-full justify-center py-3 text-base sm:w-auto" type="submit" disabled={busy}>
        {busy ? "Iniciando…" : "Iniciar projeto"}
      </button>
    </form>
  );
}
