import { FeesCalculator } from "@/components/FeesCalculator";

export const metadata = { title: "Taxas do criador" };

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Taxas do criador</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Quanto cada fase paga ao criador, pela tabela oficial do Pump.fun. Use para projetar receita por volume real,
          não por FDV.
        </p>
      </div>
      <FeesCalculator />
    </>
  );
}
