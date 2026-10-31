import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProjectWizard } from "@/components/ProjectWizard";

export const metadata = { title: "Criar site de projeto" };

export default function Page() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/app/mercado" className="btn btn-ghost text-sm">
          Abrir painel
        </Link>
      </header>
      <main className="mx-auto max-w-4xl px-5 pb-20">
        <h1 className="text-3xl font-bold">Criar site de projeto</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Quatro passos. No fim, o site público fica em <span className="mono">/p/seu-endereco</span> com token, carteiras
          declaradas, políticas e canais. Você pode começar sem token e adicionar o mint depois.
        </p>
        <div className="mt-8">
          <ProjectWizard />
        </div>
      </main>
    </div>
  );
}
