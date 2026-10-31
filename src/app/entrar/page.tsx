import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";
import { Alert } from "@/components/ui";
import { authEnabled } from "@/lib/auth";
import { hasUsers } from "@/lib/users";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const enabled = authEnabled();
  const users = await hasUsers();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Logo />
      <div>
        <h1 className="text-2xl font-bold">Entrar no Estaleiro</h1>
        <p className="mt-1 text-sm text-ink-soft">Painel do operador e administração. Os sites públicos dos projetos não pedem login.</p>
      </div>
      {!enabled && <Alert tone="warn">Acesso aberto: sem FAROL_SECRET no ambiente, o painel não exige login (uso local).</Alert>}
      {enabled && !users && (
        <Alert tone="warn">Nenhum usuário cadastrado. Defina FAROL_ADMIN_EMAIL e FAROL_ADMIN_PASSWORD no .env e reinicie para criar o primeiro administrador.</Alert>
      )}
      <LoginForm next={next && next.startsWith("/") ? next : "/app"} />
    </main>
  );
}
