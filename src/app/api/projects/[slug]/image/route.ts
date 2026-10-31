import { getProject } from "@/lib/projects/store";

export const dynamic = "force-dynamic";

/** Logotipo do token gerado do brief: monograma do ticker sobre a cor de destaque, com o feixe do Farol. */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getProject(slug);
  if (!p) return new Response("not found", { status: 404 });
  const mono = p.ticker.slice(0, 3).toUpperCase();
  const size = mono.length === 3 ? 150 : mono.length === 2 ? 200 : 260;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="#0E1B2A"/></linearGradient>
    <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#F3F6F5" stop-opacity="0.35"/><stop offset="1" stop-color="#F3F6F5" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path d="M120 256 L512 120 L512 392 Z" fill="url(#beam)"/>
  <text x="256" y="256" dy="0.36em" text-anchor="middle" font-family="Bricolage Grotesque, Inter, system-ui, sans-serif" font-weight="800" font-size="${size}" fill="#F3F6F5" letter-spacing="-4">${mono}</text>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" } });
}
