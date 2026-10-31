import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MintForm } from "@/components/MintForm";
import { listProjects } from "@/lib/projects/store";
import { STAGE_LABEL } from "@/lib/projects/schema";

export const dynamic = "force-dynamic";

/* O palco usa as coordenadas do PNG do emblema (1254 x 1254). O globo fica
   centrado em (610, 740). Quatro órbitas inclinadas, cada uma com período
   próprio. Cada trajeto começa no ponto mais próximo (frente) e passa pelo
   mais distante na metade. Cada moeda existe em duas camadas: uma atrás do
   emblema, outra na frente, e a visibilidade troca nas laterais da órbita. */
const CX = 610;
const CY = 740;

type Orbit = { id: string; rx: number; ry: number; rot: number; period: number; size: number; phase: number; coins: string[] };

const ORBITS: Orbit[] = [
  { id: "a", rx: 560, ry: 190, rot: -8, period: 48, size: 170, phase: 0.08, coins: ["shiba", "pill"] },
  { id: "b", rx: 470, ry: 270, rot: 18, period: 38, size: 184, phase: 0.31, coins: ["doge", "pepe"] },
  { id: "c", rx: 600, ry: 150, rot: 4, period: 58, size: 152, phase: 0.62, coins: ["cat", "wave"] },
  { id: "d", rx: 400, ry: 330, rot: -30, period: 32, size: 192, phase: 0.47, coins: ["viking", "penguin"] },
];

const f = (n: number) => n.toFixed(1);

function orbitPath({ rx, ry, rot }: Orbit) {
  const t = (rot * Math.PI) / 180;
  const sx = CX - Math.sin(t) * ry;
  const sy = CY + Math.cos(t) * ry;
  const ex = CX + Math.sin(t) * ry;
  const ey = CY - Math.cos(t) * ry;
  return `M ${f(sx)} ${f(sy)} A ${rx} ${ry} ${rot} 1 1 ${f(ex)} ${f(ey)} A ${rx} ${ry} ${rot} 1 1 ${f(sx)} ${f(sy)} Z`;
}

/* Ponto da órbita para a fração u do trajeto (0 = frente, 0.5 = fundo). */
function orbitPoint({ rx, ry, rot }: Orbit, u: number) {
  const t = (rot * Math.PI) / 180;
  const a = Math.PI / 2 + u * Math.PI * 2;
  return {
    x: CX + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t),
    y: CY + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t),
    depth: (1 + Math.sin(a)) / 2,
  };
}

function coinDelay(o: Orbit, j: number) {
  return -((j / o.coins.length + o.phase) % 1) * o.period;
}

/* As duas camadas (atrás e à frente do emblema) ficam no mesmo SVG para
   compartilhar a mesma linha do tempo. */
function CoinLayer({ side }: { side: "back" | "front" }) {
  return (
    <g className={`orbit-${side}`}>
      {ORBITS.flatMap((o) =>
        o.coins.map((name, j) => {
          const delay = coinDelay(o, j);
          const half = o.size / 2;
          return (
            <g key={name}>
              <animateMotion dur={`${o.period}s`} repeatCount="indefinite" begin={`${delay.toFixed(2)}s`} calcMode="linear">
                <mpath href={`#orbit-${o.id}`} />
              </animateMotion>
              <image
                className={`moon moon-${side}`}
                style={{ animationDuration: `${o.period}s`, animationDelay: `${delay.toFixed(2)}s` }}
                href={`/brand/coins/${name}.webp`}
                width={o.size}
                height={o.size}
                x={-half}
                y={-half}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

/* Sem movimento: as moedas ficam paradas nos pontos iniciais das órbitas. */
function CoinsStill() {
  return (
    <g className="orbit-still">
      {ORBITS.flatMap((o, i) =>
        o.coins.map((name, j) => {
          const p = orbitPoint(o, (i / ORBITS.length + j / 2 + 0.12) % 1);
          const s = o.size * (0.74 + 0.3 * p.depth);
          return <image key={name} href={`/brand/coins/${name}.webp`} width={s} height={s} x={p.x - s / 2} y={p.y - s / 2} opacity={0.7 + 0.3 * p.depth} />;
        }),
      )}
    </g>
  );
}

function BrandStage() {
  return (
    <svg className="brand-stage" viewBox="0 0 1254 1254" role="img" aria-label="Emblema AtlasMeme: a letra A em cromo sobre o globo, com memecoins em órbita">
      {ORBITS.map((o) => (
        <path key={o.id} id={`orbit-${o.id}`} className="orbit-guide" d={orbitPath(o)} />
      ))}
      <CoinLayer side="back" />
      <image className="brand-emblem" href="/brand/emblem.webp" width="1254" height="1254" />
      <CoinLayer side="front" />
      <g className="orbit-front">
        <animateMotion dur="25s" repeatCount="indefinite" begin="-6s" calcMode="linear">
          <mpath href="#orbit-a" />
        </animateMotion>
        <circle className="spark" r="5" />
      </g>
      <CoinsStill />
    </svg>
  );
}

const PARTES = [
  ["Site", "Página no ar antes do anúncio, com mint e regras."],
  ["Carteiras", "Operação e tesouraria, cada uma com a função publicada."],
  ["Curva", "Meteora. A liquidez trava quando a moeda gradua."],
  ["Caixa", "Taxa recebida menos o gasto do projeto."],
];

export default async function Home() {
  const projects = await listProjects();
  const lead = projects[0];

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
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

      <section className="brand-hero" aria-label="Marca AtlasMeme">
        <div className="brand-sky" aria-hidden />
        <BrandStage />
        <div className="brand-lockup">
          <img className="brand-wordmark" src="/brand/wordmark.webp" alt="AtlasMeme" />
          <p className="brand-domain">
            <span aria-hidden />
            atlasmeme.opcore.com.br
            <span aria-hidden />
          </p>
          <p className="brand-tagline">Um ecossistema. Infinitas memecoins.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:px-10 lg:py-12">
        <div>
          <h1 className="max-w-[16ch] text-4xl leading-[1.05] md:text-5xl">O atlas das memecoins.</h1>
          <p className="reading mt-4 text-ink-soft">Cada moeda entra no mapa com site, carteiras, curva e caixa.</p>
          <dl className="mt-8 max-w-xl">
            {PARTES.map(([t, d]) => (
              <div key={t} className="grid gap-1 border-t border-line py-3.5 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
                <dt className="font-medium">{t}</dt>
                <dd className="text-sm leading-relaxed text-ink-soft">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="card p-6">
          <img className="card-globe" src="/brand/globe.webp" alt="" aria-hidden />
          <p className="text-sm text-ink-soft">
            {projects.length === 0
              ? "Nenhuma moeda plotada ainda. O emblema é a marca, não um lançamento."
              : "O emblema mostra o ecossistema. A única moeda aberta no sistema é esta."}
          </p>
          {lead ? (
            <Link href={`/p/${lead.slug}`} className="mt-5 block border-t border-line pt-4">
              <span className="block text-lg font-semibold">{lead.name}</span>
              <span className="mt-1 block text-sm text-ink-soft">${lead.ticker}</span>
              <span className="block text-sm text-ink-soft">{STAGE_LABEL[lead.stage]}</span>
            </Link>
          ) : (
            <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">O primeiro lançamento ocupa este lugar.</p>
          )}
          {projects.slice(1, 4).map((p) => (
            <Link key={p.slug} href={`/p/${p.slug}`} className="mt-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{p.name}</span>
              <span className="text-ink-soft">${p.ticker}</span>
            </Link>
          ))}
        </aside>
      </div>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
          <h2 className="text-xl">Ler um mint</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">Preço e liquidez vêm da rede. A hora da leitura fica ao lado do número.</p>
          <div className="mt-4 max-w-xl">
            <Suspense>
              <MintForm />
            </Suspense>
          </div>
          <p className="mt-10 max-w-xl text-sm text-mist">O AtlasMeme abre o projeto e lê o caixa. Isso não é consultoria financeira.</p>
        </div>
      </section>
    </div>
  );
}
