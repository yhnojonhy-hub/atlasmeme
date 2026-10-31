import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Logo />
      <div>
        <h1 className="text-2xl font-bold">Painel do operador</h1>
        <p className="mt-1 text-sm text-ink-soft">Informe o token definido em FAROL_ADMIN_TOKEN na VM. Os sites públicos dos projetos não precisam dele.</p>
      </div>
      <LoginForm next={next && next.startsWith("/") ? next : "/app/iniciar"} />
    </main>
  );
}
