import { Suspense } from "react";
import { Shell } from "@/components/Shell";

// Renderizado a cada requisição: o Shell lê `?mint=` e, se fosse pré-renderizado,
// o HTML inicial de todas as abas viria só com o fallback "Carregando…".
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-mist">Carregando…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
