import { Suspense } from "react";
import { MarketView } from "@/components/MarketView";
import { MintForm } from "@/components/MintForm";
import { Empty } from "@/components/ui";
import { isMint } from "@/lib/adapters/types";

export const metadata = { title: "Mercado" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mint?: string }> }) {
  const { mint } = await searchParams;
  const valid = isMint(mint);
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Mercado</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Preço, liquidez, volume e estado do pool, lidos do indexador e da rede. Atualiza a cada 15 segundos.
        </p>
      </div>
      <Suspense>
        <MintForm />
      </Suspense>
      {valid ? (
        <MarketView mint={mint} />
      ) : (
        <Empty
          title="Cole um mint para começar"
          body="A leitura vem da rede e do indexador para aquele endereço. Esta tela não assina nem envia transação."
        />
      )}
    </>
  );
}
