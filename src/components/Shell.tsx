"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

export const TABS = [
  { href: "/app/iniciar", label: "Iniciar projeto", short: "Iniciar", desc: "Do brief ao lucro, automático" },
  { href: "/app/mercado", label: "Mercado", short: "Mercado", desc: "Preço, liquidez e pool" },
  { href: "/app/fees", label: "Taxas do criador", short: "Taxas", desc: "Quanto cada fase paga" },
  { href: "/app/carteiras", label: "Carteiras", short: "Carteiras", desc: "Quem é quem, declarado" },
  { href: "/app/comunidade", label: "Comunidade", short: "Pessoas", desc: "Retenção e custo" },
  { href: "/app/negocio", label: "Negócio", short: "Negócio", desc: "Pagantes, margem, caixa" },
  { href: "/app/risco", label: "Risco", short: "Risco", desc: "Autoridades e saída" },
  { href: "/app/lancamento", label: "Lançamento", short: "Lançar", desc: "Gates e ciclo de vida" },
  { href: "/app/apis", label: "APIs", short: "APIs", desc: "O que cada integração faz" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const mint = params.get("mint");
  const q = mint ? `?mint=${mint}` : "";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-line bg-paper lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Abas">
          {TABS.map((t) => {
            const active = path === t.href || path.startsWith(`${t.href}/`);
            return (
              <Link key={t.href} href={`${t.href}${q}`} className="tab-link" aria-current={active ? "page" : undefined}>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className={`block text-xs ${active ? "text-foam/70" : "text-mist"}`}>{t.desc}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-5 py-5 text-xs text-mist">
          <Link href="/app/iniciar" className="btn btn-beam w-full justify-center text-sm">
            Iniciar projeto
          </Link>
          <Link href="/novo" className="btn btn-ghost w-full justify-center text-sm">
            Só o site, à mão
          </Link>
          <p>Números com fonte e horário. FDV não é caixa.</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
          <Logo compact />
          <Link href="/app/iniciar" className="btn btn-beam px-3 py-2 text-sm">
            Iniciar
          </Link>
        </header>
        <main className="flex-1 px-4 py-6 pb-36 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-1 border-t border-line bg-paper px-2 py-1.5 lg:hidden"
          aria-label="Abas"
        >
          {TABS.map((t) => {
            const active = path === t.href || path.startsWith(`${t.href}/`);
            return (
              <Link
                key={t.href}
                href={`${t.href}${q}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-1 py-1.5 text-center text-[11px] font-semibold ${
                  active ? "bg-ink text-foam" : "text-ink-soft"
                }`}
              >
                {t.short}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
