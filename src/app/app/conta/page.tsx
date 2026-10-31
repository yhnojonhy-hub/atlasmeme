import { PasswordForm } from "@/components/PasswordForm";
import { Alert, Section } from "@/components/ui";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ trocar?: string; next?: string }> }) {
  const { trocar, next } = await searchParams;
  const me = await currentUser();
  const u = me?.user;
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <p className="mt-1 text-ink-soft">{u ? `${u.name} · ${u.email} · ${u.role}` : "Acesso local sem usuário."}</p>
      </div>
      {u?.mustChangePassword && <Alert tone="warn">Esta senha foi definida por semente (ou por um administrador). Troque-a antes de operar.</Alert>}
      {u ? (
        <Section title="Trocar senha" lead="A senha é guardada só como hash (scrypt). Ninguém consegue lê-la, nem o administrador.">
          <PasswordForm next={trocar && next && next.startsWith("/") ? next : undefined} />
        </Section>
      ) : (
        <Alert tone="info">Sem login ativo (FAROL_SECRET ausente). Em produção, defina FAROL_SECRET, FAROL_ADMIN_EMAIL e FAROL_ADMIN_PASSWORD.</Alert>
      )}
    </>
  );
}
