"use client";

import { useEffect, useState } from "react";
import { Alert } from "./ui";

type Gate = { id: string; title: string; when: string; items: string[] };

export const GATES: Gate[] = [
  {
    id: "descoberta",
    title: "Descoberta",
    when: "Semanas 1–2 · teto US$ 1 000–3 000 · sem lançamento público",
    items: [
      "Tema definido e direitos de uso da marca conferidos",
      "Entrevistas com o público: interesse espontâneo e objeções anotadas",
      "Site com cadastro consentido, canais oficiais (X, Telegram) criados antes do mint",
      "Orçamento do piloto aprovado e caixa separado da operação principal",
    ],
  },
  {
    id: "comunidade",
    title: "Comunidade sem token",
    when: "Semanas 2–4 · medir antes de emitir",
    items: [
      "Retenção em 7 e 30 dias registrada por coorte",
      "Custo por participante retido calculado e abaixo da contribuição esperada",
      "Parcela orgânica das inscrições documentada",
      "Pesquisa de disposição a pagar pelo software ou serviços",
      "Gate: retenção 30 dias ≥ 20% e CAC ≤ contribuição — senão, não emitir",
    ],
  },
  {
    id: "ensaio",
    title: "Ensaio técnico",
    when: "Antes do lançamento · conferência humana",
    items: [
      "Documento público: oferta, alocações, vesting, políticas de liquidez e vendas da equipe",
      "Carteiras da equipe, tesouraria e vesting declaradas no Farol",
      "Tesouraria em multisig (Squads) com política de aprovação",
      "Configuração do launchpad revisada por duas pessoas; ambiente de teste separado",
      "Revisão jurídica do modelo concreto (CVM/BCB) e tributação",
    ],
  },
  {
    id: "lancado",
    title: "Lançado",
    when: "Operação · prestação de contas contínua",
    items: [
      "Mint e pool confirmados por endereço; indexação monitorada (sem prometer listagem)",
      "Taxas do criador reclamadas em cadência fixa e publicadas na tesouraria",
      "Conteúdo com dono humano: calendário, encontros, respostas em até 24 h",
      "Métricas semanais: pessoas retidas, volume elegível, taxa efetiva por fase, caixa",
      "Dossiê CoinMarketCap só se os critérios mínimos estiverem cumpridos",
    ],
  },
  {
    id: "encerrado",
    title: "Encerramento ou continuidade (dia 90)",
    when: "Decisão com base em pagantes, margem, recorrência e taxas",
    items: [
      "Relatório público: entradas, saídas, taxas reclamadas, posição da equipe",
      "Se continuar: expandir software para vários projetos ou iterar comunidade",
      "Se encerrar: parar gastos, reclamar taxas pendentes, arquivar canais ou transferir para a comunidade (CTO)",
      "Nunca: retirada oculta, venda fora do vesting, volume artificial para “segurar” o gráfico",
    ],
  },
];

const KEY = "farol.launch.checklist.v1";

export function LaunchChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Hidrata do navegador fora do fluxo de render para não divergir do SSR.
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) setDone(JSON.parse(raw));
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function toggle(k: string) {
    setDone((d) => {
      const next = { ...d, [k]: !d[k] };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  const total = GATES.reduce((s, g) => s + g.items.length, 0);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-ink-soft">Progresso</div>
          <div className="num text-2xl font-semibold">
            {count} / {total}
          </div>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-foam-2">
          <div className="h-full bg-tide" style={{ width: `${(count / total) * 100}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {GATES.map((g, gi) => {
          const gDone = g.items.every((_, i) => done[`${g.id}.${i}`]);
          return (
            <li key={g.id} className={`card p-5 ${gDone ? "border-ok" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  <span className="mr-2 text-tide">Etapa {gi + 1}</span>
                  {g.title}
                </h3>
                <span className="text-xs text-mist">{g.when}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {g.items.map((it, i) => {
                  const k = `${g.id}.${i}`;
                  return (
                    <li key={k}>
                      <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <input type="checkbox" className="mt-1" checked={!!done[k]} onChange={() => toggle(k)} />
                        <span className={done[k] ? "text-mist line-through" : ""}>{it}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      <Alert tone="info">
        Este checklist fica salvo neste navegador. Avance uma etapa só quando todos os itens estiverem feitos; os gates existem
        para não emitir token sem comunidade e não gastar sem retenção.
      </Alert>
    </div>
  );
}
