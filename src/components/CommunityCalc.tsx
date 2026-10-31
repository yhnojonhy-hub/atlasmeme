"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { acquisition } from "@/lib/metrics/business";
import { Alert, Field, Stat } from "./ui";

export function CommunityCalc() {
  const [consented, setConsented] = useState(1200);
  const [d7, setD7] = useState(420);
  const [d30, setD30] = useState(300);
  const [organicShare, setOrganicShare] = useState(0.35);
  const [spend, setSpend] = useState(1500);
  const [contribution, setContribution] = useState(3);

  const r = useMemo(() => {
    const a = acquisition({ spend, retainedParticipants: d30, contributionPerParticipant: contribution });
    return {
      ...a,
      r7: consented > 0 ? d7 / consented : 0,
      r30: consented > 0 ? d30 / consented : 0,
    };
  }, [consented, d7, d30, spend, contribution]);

  const healthy = r.r30 >= 0.2 && r.netPerParticipant !== null && r.netPerParticipant >= 0;

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Pessoas com consentimento" hint="cadastros reais, não carteiras">
          <input className="input num" type="number" min={0} value={consented} onChange={(e) => setConsented(Number(e.target.value))} />
        </Field>
        <Field label="Ativas em 7 dias">
          <input className="input num" type="number" min={0} value={d7} onChange={(e) => setD7(Number(e.target.value))} />
        </Field>
        <Field label="Retidas em 30 dias">
          <input className="input num" type="number" min={0} value={d30} onChange={(e) => setD30(Number(e.target.value))} />
        </Field>
        <Field label="Parcela orgânica das inscrições" hint="0 a 1">
          <input className="input num" type="number" min={0} max={1} step={0.05} value={organicShare} onChange={(e) => setOrganicShare(Number(e.target.value))} />
        </Field>
        <Field label="Verba de aquisição no período (US$)">
          <input className="input num" type="number" min={0} value={spend} onChange={(e) => setSpend(Number(e.target.value))} />
        </Field>
        <Field label="Contribuição por participante (US$)" hint="receita menos custo de atendimento, por pessoa retida">
          <input className="input num" type="number" min={0} step={0.5} value={contribution} onChange={(e) => setContribution(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Retenção 7 dias" value={fmt.pct1(r.r7)} tone={r.r7 >= 0.35 ? "good" : "default"} />
        <Stat label="Retenção 30 dias" value={fmt.pct1(r.r30)} tone={r.r30 >= 0.2 ? "good" : r.r30 < 0.1 ? "bad" : "default"} hint="meta do piloto: 20% ou mais" />
        <Stat label="Custo por participante retido" value={fmt.usd2(r.cac)} hint={`${fmt.pct1(organicShare)} das inscrições vieram sem mídia paga`} />
        <Stat
          label="Resultado por participante"
          value={fmt.usd2(r.netPerParticipant)}
          tone={r.netPerParticipant == null ? "default" : r.netPerParticipant >= 0 ? "good" : "bad"}
          hint="contribuição menos custo de aquisição"
        />
      </div>

      <Alert tone={healthy ? "good" : "warn"}>
        {healthy
          ? "A coorte se paga: retenção acima de 20% e aquisição abaixo da contribuição. Mantém o ritmo e documenta a origem das inscrições."
          : "A coorte ainda não se paga. Antes de gastar mais em aquisição, melhore retenção (conteúdo com dono, encontros, respostas rápidas) ou aumente a contribuição por pessoa. Seguidores e pico de gráfico não entram nesta conta."}
      </Alert>

      <div className="card p-5 text-sm text-ink-soft">
        <h3 className="font-semibold text-ink">O que conta como pessoa</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Cadastro com consentimento, com canal de origem registrado.</li>
          <li>Vínculo com carteira é opcional e por assinatura de mensagem, sem permissão de transferência.</li>
          <li>Endereços de carteira não são somados como pessoas distintas.</li>
          <li>Incentivos pagam contribuição real (conteúdo, moderação, suporte), nunca negociação circular.</li>
        </ul>
      </div>
    </div>
  );
}
