"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { cpmmExit } from "@/lib/metrics/business";
import { Alert, Field, Stat } from "./ui";

export function RiskCalc() {
  const [quote, setQuote] = useState(20000);
  const [tokens, setTokens] = useState(100_000_000);
  const [supply, setSupply] = useState(1_000_000_000);

  const price = tokens > 0 ? quote / tokens : 0;
  const fdv = price * supply;
  const rows = useMemo(
    () =>
      [1000, 5000, 10000, 20000, 50000].map((nominal) => {
        const q = price > 0 ? nominal / price : 0;
        const out = cpmmExit(quote, tokens, q);
        return { nominal, q, out, loss: nominal > 0 ? 1 - out / nominal : 0 };
      }),
    [price, quote, tokens],
  );

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Reserva em cotação (US$)" hint="USDC tratado como US$ 1">
          <input className="input num" type="number" min={0} value={quote} onChange={(e) => setQuote(Number(e.target.value))} />
        </Field>
        <Field label="Reserva em tokens">
          <input className="input num" type="number" min={0} value={tokens} onChange={(e) => setTokens(Number(e.target.value))} />
        </Field>
        <Field label="Oferta total">
          <input className="input num" type="number" min={0} value={supply} onChange={(e) => setSupply(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Preço marginal" value={fmt.price(price)} />
        <Stat label="FDV indicativa" value={fmt.usd(fdv)} hint="não é dinheiro disponível" />
        <Stat label="Dinheiro de verdade no pool" value={fmt.usd(quote)} tone="beam" hint="só o lado de cotação sai como caixa" />
      </div>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Venda ao preço inicial</th>
              <th>Tokens vendidos</th>
              <th>Cotação recebida</th>
              <th>Perda frente ao nominal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nominal}>
                <td className="num">{fmt.usd(r.nominal)}</td>
                <td className="num">{fmt.num(r.q)}</td>
                <td className="num">{fmt.usd2(r.out)}</td>
                <td className={`num ${r.loss > 0.2 ? "text-rock" : ""}`}>{fmt.pct(r.loss)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mist">
        Fórmula x·y = k sem taxas: saída = Y·q / (X + q). Cada linha parte das mesmas reservas; não é uma sequência de vendas.
        Fonte: documentação do CPMM da Raydium.
      </p>

      <Alert tone="warn">
        No Pump.fun, a LP do pool canônico é queimada na migração. Não existe “fechar o pool e sacar”. A única saída de caixa do
        projeto é taxa do criador reclamada e venda declarada dentro da política de vesting.
      </Alert>
    </div>
  );
}
