import { redirect } from "next/navigation";
import { FinancePanel } from "@/components/FinancePanel";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Financeiro" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await currentUser();
  if (!me || me.session.role !== "admin") redirect("/app/iniciar");
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Quanto entrou de lucro e quanto cada sistema completo está consumindo. Receita só conta quando as taxas são reclamadas
          para a carteira; o que ainda está no protocolo aparece como &quot;a reclamar&quot;.
        </p>
      </div>
      <FinancePanel />
    </>
  );
}
