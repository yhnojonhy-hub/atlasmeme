"use client";

import { useEffect, useState } from "react";
import type { Pair } from "@/lib/adapters/dexscreener";
import type { MintInfo } from "@/lib/adapters/solana";
import type { Result } from "@/lib/adapters/types";
import { fmt } from "@/lib/format";
import { Alert, Empty, Pill, SourceStamp, Stat } from "./ui";

/** Ao trocar de mint, o `key` remonta o componente e zera o estado sem setState no effect. */
export function MarketView({ mint }: { mint: string }) {
  return <MarketViewInner key={mint} mint={mint} />;
}

function MarketViewInner({ mint }: { mint: string }) {
  const [pairs, setPairs] = useState<Result<Pair[]> | null>(null);
  const [token, setToken] = useState<Result<MintInfo> | null>(null);

  useEffect(() => {
    let alive = true;
    const loadPairs = () =>
      fetch(`/api/market/${mint}`)
        .then(async (r) => alive && setPairs(await r.json()))
        .catch(() => undefined);
    const loadToken = () =>
      fetch(`/api/token/${mint}`)
        .then(async (r) => alive && setToken(await r.json()))
        .catch(() => undefined);
    loadPairs();
    loadToken();
    const id = setInterval(loadPairs, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mint]);

  const top = pairs?.ok ? pairs.data[0] : undefined;
  const totalLiq = pairs?.ok ? pairs.data.reduce((s, p) => s + (p.liquidity?.usd ?? 0), 0) : 0;
  const vol24 = pairs?.ok ? pairs.data.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0) : 0;
  const liqToMcap = top?.marketCap ? totalLiq / top.marketCap : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Preço indicativo" value={top ? fmt.price(top.priceUsd) : "—"} hint={top ? `${top.dexId} · ${top.quoteToken.symbol}` : "sem par indexado"} />
        <Stat label="Liquidez somada" value={fmt.usd(totalLiq)} hint="reservas reais em todos os pares" />
        <Stat label="Volume 24 h" value={fmt.usd(vol24)} hint="cada negociação contada uma vez pelo indexador" />
        <Stat
          label="Liquidez / market cap"
          value={liqToMcap == null ? "—" : fmt.pct(liqToMcap)}
          tone={liqToMcap == null ? "default" : liqToMcap >= 0.1 ? "good" : "bad"}
          hint={top?.marketCap ? `market cap ${fmt.usd(top.marketCap)}` : "market cap não informado"}
        />
      </div>

      {pairs && (
        <SourceStamp source={pairs.source} url={pairs.sourceUrl} fetchedAt={pairs.fetchedAt} latencyMs={pairs.latencyMs} cacheHit={pairs.ok ? pairs.cacheHit : false} />
      )}

      {pairs && !pairs.ok && <Alert tone="warn">Indexador indisponível: {pairs.error}. O estado fica “pendente”; não assuma que o token não existe.</Alert>}

      {pairs?.ok && pairs.data.length === 0 && (
        <Empty
          title="Nenhum par indexado para este mint"
          body="O DEX Screener lista automaticamente quando há um pool com pelo menos uma transação. Sem pool, o token pode ainda estar na curva do launchpad ou não ter mercado."
        />
      )}

      {pairs?.ok && pairs.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>DEX</th>
                <th>Par</th>
                <th>Preço</th>
                <th>Liquidez</th>
                <th>Volume 24 h</th>
                <th>Compras / vendas 24 h</th>
                <th>Var. 24 h</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {pairs.data.map((p) => (
                <tr key={p.pairAddress}>
                  <td>
                    <a href={p.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline">
                      {p.dexId}
                    </a>
                    {p.labels?.length ? <span className="ml-1 text-xs text-mist">{p.labels.join(", ")}</span> : null}
                  </td>
                  <td>
                    {p.baseToken.symbol}/{p.quoteToken.symbol}
                    <div className="mono text-mist">{fmt.short(p.pairAddress, 6)}</div>
                  </td>
                  <td className="num">{fmt.price(p.priceUsd)}</td>
                  <td className="num">{fmt.usd(p.liquidity?.usd)}</td>
                  <td className="num">{fmt.usd(p.volume?.h24)}</td>
                  <td className="num">
                    {p.txns?.h24 ? `${fmt.num(p.txns.h24.buys)} / ${fmt.num(p.txns.h24.sells)}` : "—"}
                  </td>
                  <td className={`num ${(p.priceChange?.h24 ?? 0) < 0 ? "text-rock" : "text-ok"}`}>
                    {p.priceChange?.h24 == null ? "—" : `${p.priceChange.h24.toFixed(1)}%`}
                  </td>
                  <td className="text-xs text-mist">
                    {p.pairCreatedAt ? new Date(p.pairCreatedAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Leitura do mint na rede</h3>
          {token?.ok && (
            <div className="flex flex-wrap gap-2">
              <Pill tone="tide">{token.data.program}</Pill>
              <Pill tone={token.data.mintAuthority ? "bad" : "good"}>
                emissão {token.data.mintAuthority ? "ativa" : "revogada"}
              </Pill>
              <Pill tone={token.data.freezeAuthority ? "bad" : "good"}>
                congelamento {token.data.freezeAuthority ? "ativo" : "revogado"}
              </Pill>
            </div>
          )}
        </div>
        {!token && <p className="mt-2 text-sm text-mist">Lendo…</p>}
        {token && !token.ok && <Alert tone="warn">RPC: {token.error}</Alert>}
        {token?.ok && (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-mist">Oferta total</dt>
              <dd className="num font-semibold">{fmt.num(token.data.supplyUi)}</dd>
            </div>
            <div>
              <dt className="text-mist">Decimais</dt>
              <dd className="num font-semibold">{token.data.decimals}</dd>
            </div>
            <div>
              <dt className="text-mist">Autoridade de emissão</dt>
              <dd className="mono">{token.data.mintAuthority ?? "nenhuma"}</dd>
            </div>
            <div>
              <dt className="text-mist">Autoridade de congelamento</dt>
              <dd className="mono">{token.data.freezeAuthority ?? "nenhuma"}</dd>
            </div>
            {token.data.extensions.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-mist">Extensões Token-2022</dt>
                <dd>{token.data.extensions.join(", ")}</dd>
              </div>
            )}
          </dl>
        )}
        {token && (
          <div className="mt-3">
            <SourceStamp source={token.source} url={token.sourceUrl} fetchedAt={token.fetchedAt} latencyMs={token.latencyMs} cacheHit={token.ok ? token.cacheHit : false} />
          </div>
        )}
        <p className="mt-3 text-xs text-mist">
          Revogar emissão não prova que a liquidez está bloqueada. Market cap não é dinheiro disponível para saque.
          Explorador:{" "}
          <a className="underline" href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer">
            Solscan
          </a>
        </p>
      </div>
    </div>
  );
}
