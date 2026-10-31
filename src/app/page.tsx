import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MintForm } from "@/components/MintForm";
import { listProjects } from "@/lib/projects/store";
import { STAGE_LABEL } from "@/lib/projects/schema";

export const dynamic = "force-dynamic";

const PASSOS = [
  ["Brief", "Nome, ticker e uma frase sobre o projeto. O restante sai do padrão."],
  ["Site e carteiras", "Página pública, duas carteiras cifradas e declaradas por função."],
  ["Curva", "Lançamento na Meteora com taxa por negociação. A liquidez trava depois da graduação."],
  ["Caixa", "Preço, taxas e custos lidos sem parar. Lucro é o que entrou na carteira menos o que foi gasto."],
];

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/entrar" className="btn btn-ghost">
            Entrar
          </Link>
          <Link href="/app/iniciar" className="btn btn-beam">
            Iniciar projeto
          </Link>
        </nav>
      </header>

      <section className="bg-ink text-foam">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <h1 className="display text-6xl font-extrabold leading-[0.9] sm:text-8xl">Estaleiro</h1>
          <p className="reading mt-6 text-lg text-foam/85">
            Monta a moeda, o site, as carteiras e a curva. Depois fica no caixa até o lucro aparecer na carteira.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/app/iniciar" className="btn btn-beam">
              Iniciar projeto
            </Link>
            <Link href="/app/mercado" className="btn btn-on-dark">
              Ler um token
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-3xl font-extrabold">O que acontece depois do botão</h2>
        <ol className="mt-6 divide-y divide-line border-y border-line">
          {PASSOS.map(([t, d], i) => (
            <li key={t} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
              <div className="font-extrabold text-primer">
                {i + 1}. {t}
              </div>
              <p className="reading text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl font-extrabold">Projetos publicados</h2>
            <Link href="/app/iniciar" className="btn btn-ghost text-sm">
              Iniciar projeto
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="reading mt-4 text-ink-soft">Nenhum projeto publicado ainda.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/p/${p.slug}`} className="flex items-baseline justify-between gap-4 py-4">
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="inline-block h-3 w-3 shrink-0" style={{ backgroundColor: p.accent }} aria-hidden />
                      <span className="truncate text-2xl font-extrabold">{p.name}</span>
                      <span className="text-mist">${p.ticker}</span>
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{STAGE_LABEL[p.stage]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-2xl font-extrabold">Ler um token que já existe</h2>
          <p className="reading mt-2 text-ink-soft">Cole o mint. A leitura vem da rede e do indexador, com a hora ao lado.</p>
          <div className="mt-4 max-w-xl">
            <Suspense>
              <MintForm />
            </Suspense>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-8 text-sm text-mist">
        Estaleiro opera o lançamento e a leitura. Não é consultoria financeira. Dados de terceiros atrasam; a hora da leitura fica ao lado do número.
      </footer>
    </div>
  );
}
