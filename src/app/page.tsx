import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MintForm } from "@/components/MintForm";
import { listProjects } from "@/lib/projects/store";
import { STAGE_LABEL } from "@/lib/projects/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/app/mercado" className="btn btn-ghost">
            Abrir painel
          </Link>
          <Link href="/novo" className="btn btn-primary">
            Criar site de projeto
          </Link>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden bg-ink text-foam">
        <div className="beam" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <h1 className="display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              A verdade de um token,
              <br />
              antes do hype.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-foam/80">
              O Farol monta o site público de uma comunidade na Solana: mint, pool, carteiras
              declaradas, taxas do criador e tesouraria — cada número com fonte e horário.
            </p>
            <div className="mt-8 max-w-xl">
              <Suspense>
                <MintForm size="lg" />
              </Suspense>
              <p className="mt-2 text-xs text-foam/60">
                Só leitura. Nada é assinado, nada é enviado. Exemplo: USDC{" "}
                <Link
                  href="/app/mercado?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  className="underline underline-offset-2"
                >
                  EPjF…Dt1v
                </Link>
              </p>
            </div>
          </div>
          <dl className="grid content-end gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl border border-foam/15 bg-foam/5 p-4">
              <dt className="font-semibold">O que entra como receita</dt>
              <dd className="mt-1 text-foam/75">
                Taxas do criador reclamadas, assinaturas e serviços pagos. Nunca FDV, nunca posição em token.
              </dd>
            </div>
            <div className="rounded-xl border border-foam/15 bg-foam/5 p-4">
              <dt className="font-semibold">O que o site declara</dt>
              <dd className="mt-1 text-foam/75">
                Carteiras da equipe, tesouraria e vesting identificadas por função. Holders não viram “pessoas”.
              </dd>
            </div>
            <div className="rounded-xl border border-foam/15 bg-foam/5 p-4">
              <dt className="font-semibold">O que o Farol não faz</dt>
              <dd className="mt-1 text-foam/75">
                Não cria volume, não disfarça carteiras, não promete listagem nem valorização.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold">Como um projeto nasce aqui</h2>
            <p className="mt-2 text-ink-soft">
              O Farol não emite o token: você lança na plataforma que escolher (Pump.fun, Raydium
              LaunchLab). O Farol cuida do que vem antes e depois — a parte que convence pessoas de
              verdade.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ["Descoberta", "Tema, direitos, público. Site com cadastro consentido e canais oficiais."],
              ["Comunidade sem token", "Retenção em 7 e 30 dias, custo por participante retido, interesse espontâneo."],
              ["Ensaio técnico", "Configuração do lançamento conferida por gente; carteiras e políticas publicadas."],
              ["Lançado", "Mercado, taxas e tesouraria ao vivo no site. Prestação de contas contínua."],
            ].map(([t, d], i) => (
              <li key={t} className="card p-4">
                <div className="text-xs font-semibold text-tide">Etapa {i + 1}</div>
                <div className="mt-1 font-semibold">{t}</div>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold">Sites publicados</h2>
            <Link href="/novo" className="btn btn-beam">
              Criar o seu
            </Link>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/p/${p.slug}`} className="card block p-4 hover:border-tide">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="pill bg-foam-2 text-ink-soft">{STAGE_LABEL[p.stage]}</span>
                  </div>
                  <div className="mt-1 text-sm text-ink-soft">${p.ticker} · /p/{p.slug}</div>
                  {p.tagline && <p className="mt-2 text-sm text-ink-soft">{p.tagline}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-mist">
        Farol é um estudo de pré-implementação em operação piloto. Não é consultoria financeira.
        Dados de terceiros podem atrasar ou falhar; a hora da leitura aparece ao lado de cada número.
      </footer>
    </div>
  );
}
