import { STAGE_LABEL, type Project } from "@/lib/projects/schema";

const CX = 292;
const CY = 348;
const R = 208;
const TILT = (15 * Math.PI) / 180;

type Point = { x: number; y: number; front: boolean };

function project(latDeg: number, lonDeg: number): Point {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  return { x: CX + x * R, y: CY - y2 * R, front: z2 > 0.04 };
}

function stroke(samples: Point[]) {
  let d = "";
  let drawing = false;
  for (const p of samples) {
    if (!p.front) {
      drawing = false;
      continue;
    }
    d += `${drawing ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    drawing = true;
  }
  return d;
}

function meridian(lon: number) {
  const samples: Point[] = [];
  for (let lat = -78; lat <= 78; lat += 3) samples.push(project(lat, lon));
  return stroke(samples);
}

function parallel(lat: number) {
  const samples: Point[] = [];
  for (let lon = -88; lon <= 88; lon += 3) samples.push(project(lat, lon));
  return stroke(samples);
}

const COINS = [
  { lat: 46, lon: -52, r: 3.1 },
  { lat: 16, lon: -64, r: 2.5 },
  { lat: -6, lon: -40, r: 3.5 },
  { lat: -38, lon: -22, r: 2.6 },
  { lat: 58, lon: -12, r: 2.3 },
  { lat: 24, lon: 4, r: 2.8 },
  { lat: -22, lon: 2, r: 3.6 },
  { lat: -52, lon: 18, r: 2.4 },
  { lat: 4, lon: 24, r: 2.7 },
  { lat: -14, lon: 46, r: 2.7 },
  { lat: 58, lon: 28, r: 2.2 },
  { lat: 34, lon: 48, r: 5.2, active: true },
];

function route() {
  const samples: Point[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const lat = -6 + (34 - -6) * t + Math.sin(Math.PI * t) * 12;
    const lon = -40 + (48 - -40) * t;
    samples.push(project(lat, lon));
  }
  return stroke(samples);
}

const MERIDIANS = [-72, -48, -24, 0, 24, 48, 72].map(meridian);
const PARALLELS = [-60, -30, 0, 30, 60].map(parallel);

export function AtlasMap({ projects }: { projects: Project[] }) {
  const lead = projects[0];
  const active = COINS.find((c) => c.active) ?? COINS[COINS.length - 1];
  const spot = project(active.lat, active.lon);
  const labelX = 548;
  const labelY = spot.y + 28;

  return (
    <section className="relative min-h-[34rem] overflow-hidden bg-ink text-foam md:min-h-full" aria-label="Mapa de lançamentos">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 760 680" preserveAspectRatio="xMidYMid meet" role="img">
        <title>Atlas das memecoins</title>
        <circle cx={CX} cy={CY} r={R} fill="rgba(243,245,248,0.035)" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(243,245,248,0.72)" strokeWidth="1.35" />
        {PARALLELS.map((d) => (
          <path key={d} d={d} fill="none" stroke="rgba(243,245,248,0.28)" strokeWidth="0.9" />
        ))}
        {MERIDIANS.map((d) => (
          <path key={d} d={d} fill="none" stroke="rgba(243,245,248,0.22)" strokeWidth="0.9" />
        ))}
        <path className="atlas-route-long" pathLength={100} d={route()} fill="none" stroke="#F3F5F8" strokeWidth="1.45" strokeLinecap="round" />
        {COINS.filter((c) => !c.active && project(c.lat, c.lon).front).map((c) => {
          const p = project(c.lat, c.lon);
          return <circle key={`${c.lat}-${c.lon}`} cx={p.x} cy={p.y} r={c.r} fill="#F3F5F8" />;
        })}
        {spot.front && (
          <>
            <line x1={spot.x + 10} y1={spot.y + 8} x2={labelX - 12} y2={labelY - 16} stroke="rgba(243,245,248,0.45)" strokeWidth="1" />
            <circle className="atlas-ring" cx={spot.x} cy={spot.y} r="13" fill="none" stroke="#F3F5F8" strokeWidth="1.15" />
            <circle className="atlas-coin" cx={spot.x} cy={spot.y} r={active.r} fill="#F3F5F8" />
          </>
        )}
        <text x="56" y="58" fill="rgba(243,245,248,0.78)" fontSize="15">
          {projects.length === 0
            ? "Nenhuma moeda plotada ainda. Os pontos são o mapa vazio."
            : "Os pontos sem nome ainda não têm moeda."}
        </text>
        {lead ? (
          <a href={`/p/${lead.slug}`}>
            <text x={labelX} y={labelY} fill="#F3F5F8" fontSize="22" fontWeight="600">
              {lead.name}
            </text>
            <text x={labelX} y={labelY + 24} fill="rgba(243,245,248,0.72)" fontSize="14">
              ${lead.ticker}
            </text>
            <text x={labelX} y={labelY + 44} fill="rgba(243,245,248,0.72)" fontSize="14">
              {STAGE_LABEL[lead.stage]}
            </text>
          </a>
        ) : (
          <text x={labelX} y={labelY} fill="rgba(243,245,248,0.72)" fontSize="14">
            O primeiro lançamento ocupa este ponto.
          </text>
        )}
        {projects.slice(1, 4).map((p, i) => (
          <a key={p.slug} href={`/p/${p.slug}`}>
            <text x={labelX} y={labelY + 78 + i * 22} fill="rgba(243,245,248,0.72)" fontSize="14">
              {p.name} ${p.ticker}
            </text>
          </a>
        ))}
      </svg>
    </section>
  );
}
