import { Suspense } from "react";
import { Shell } from "@/components/Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-mist">Carregando…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
