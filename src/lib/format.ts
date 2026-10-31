const usd = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdPrecise = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const pct1 = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export const fmt = {
  pct1: (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : pct1.format(n)),
  usd: (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : usd.format(n)),
  usd2: (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : usdPrecise.format(n)),
  num: (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : num.format(n)),
  pct: (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "—" : pct.format(n)),
  price: (s?: string | number | null) => {
    if (s == null || s === "") return "—";
    const n = Number(s);
    if (!Number.isFinite(n)) return "—";
    if (n >= 1) return `US$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;
    return `US$ ${n.toLocaleString("pt-BR", { maximumSignificantDigits: 4 })}`;
  },
  time: (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—",
  short: (addr?: string | null, n = 4) =>
    !addr ? "—" : addr.length <= n * 2 + 1 ? addr : `${addr.slice(0, n)}…${addr.slice(-n)}`,
};
