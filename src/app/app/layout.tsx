import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { currentUser } from "@/lib/session";

// Renderizado a cada requisição: o Shell lê `?mint=` e, se fosse pré-renderizado,
// o HTML inicial de todas as abas viria só com o fallback "Carregando…".
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Verificação autoritativa (o proxy só checa a assinatura do cookie).
  const me = await currentUser();
  if (!me) redirect("/entrar?next=/app");
  const viewer = me.user ? { email: me.user.email, name: me.user.name, role: me.user.role, mustChangePassword: !!me.user.mustChangePassword } : { email: "local", name: "Acesso local", role: "admin" as const, mustChangePassword: false };
  return (
    <Suspense fallback={<div className="p-6 text-sm text-mist">Carregando…</div>}>
      <Shell viewer={viewer}>{children}</Shell>
    </Suspense>
  );
}
