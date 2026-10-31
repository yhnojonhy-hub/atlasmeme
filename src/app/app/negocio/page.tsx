import { BusinessCalc } from "@/components/BusinessCalc";

export const metadata = { title: "Negócio" };

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Negócio</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Pagantes, margem, recorrência e caixa. O token complementa; não sustenta a estrutura fixa.
        </p>
      </div>
      <BusinessCalc />
    </>
  );
}
