import { CommunityCalc } from "@/components/CommunityCalc";

export const metadata = { title: "Comunidade" };

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Comunidade</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Pessoas de verdade, retenção e custo por participante retido. É daqui que vem o volume que paga as taxas —
          não de carteiras.
        </p>
      </div>
      <CommunityCalc />
    </>
  );
}
