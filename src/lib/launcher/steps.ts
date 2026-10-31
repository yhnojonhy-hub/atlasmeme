import { claimDbcFees, launchOnDbc, previewCurve, solBalance } from "../adapters/meteora";
import { checkDomain, createDnsRecord, porkbunConfigured, registerDomain } from "../adapters/porkbun";
import { getPairs } from "../adapters/dexscreener";
import { postTweet, xConfigured } from "../adapters/x";
import { BASE_DOMAIN, env, envBool, envNum, PUBLIC_URL } from "../env";
import { createProject, getProject, updateProject } from "../projects/store";
import type { ProjectInput } from "../projects/schema";
import { tick } from "../tracker/monitor";
import { addEvent, addTrackCost, startTrack } from "../tracker/store";
import { createWallet, listWallets, loadKeypair, vaultReady } from "../wallets/vault";
import type { StepContext } from "./runner";
import { addCost } from "./store";
import type { BriefParsed, StepId, StepResult } from "./types";

export type StepDef = { id: StepId; run: (ctx: StepContext) => Promise<StepResult> };

const PALETTE = ["#F2B134", "#1D6B74", "#C2453A", "#4F7CAC", "#7A9E7E", "#B6657A", "#D98E04", "#3E8E7E"];

function pick(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function pct(x: number) {
  return `${(x * 100).toFixed(2).replace(".", ",")}%`;
}

export const identidade: StepDef = {
  id: "identidade",
  async run({ run }) {
    const b = run.brief;
    const accent = b.accent ?? pick(b.name);
    const hostname = BASE_DOMAIN ? `${run.slug}.${BASE_DOMAIN}` : null;
    return {
      status: "concluido",
      output: { slug: run.slug, ticker: b.ticker, accent, hostname, publicUrl: `${PUBLIC_URL}/p/${run.slug}` },
      log: [`Endereço /p/${run.slug}, ticker $${b.ticker}, cor ${accent}.`, hostname ? `Subdomínio previsto: ${hostname}` : "Sem FAROL_BASE_DOMAIN: o site fica em /p/slug até haver domínio."],
    };
  },
};

export const carteiras: StepDef = {
  id: "carteiras",
  async run({ run, log }) {
    if (!vaultReady()) {
      return { status: "espera", needs: "Defina FAROL_SECRET (≥ 16 caracteres) no .env e reinicie o container. Sem ele o cofre não cifra chaves.", action: "repetir" };
    }
    const existing = await listWallets(run.slug);
    const find = (role: string) => existing.find((w) => w.role === role);
    const creator = find("operacao") ?? (await createWallet({ slug: run.slug, role: "operacao", label: "Carteira de operação — paga o lançamento e recebe a parte do criador" }));
    const treasury = find("tesouraria") ?? (await createWallet({ slug: run.slug, role: "tesouraria", label: "Tesouraria — recebe a parte de parceiro das taxas e sobras da curva" }));
    await log(`Operação: ${creator.pubkey}`);
    await log(`Tesouraria: ${treasury.pubkey}`);
    return {
      status: "concluido",
      output: { creator: creator.pubkey, treasury: treasury.pubkey },
      log: ["Chaves cifradas em repouso (AES-256-GCM). Exportação só com o segredo mestre.", "As duas carteiras serão declaradas no site, por função."],
    };
  },
};

function policiesFor(b: BriefParsed) {
  const p = previewCurve(b);
  return {
    mintAuthority: "revogada" as const,
    freezeAuthority: "revogada" as const,
    liquidity: "Lançado na Meteora Dynamic Bonding Curve. Ao graduar, 100% da liquidez migra para um pool DAMM v2 e fica travada permanentemente. Ninguém pode fechar o pool.",
    teamSales:
      b.teamAllocationPct > 0
        ? `Equipe: ${b.teamAllocationPct}% da oferta, travados em vesting linear de ${b.teamVestingMonths} meses após a graduação. Vendas só dentro desse calendário e anunciadas antes.`
        : "Equipe não recebe alocação de tokens. Não há pré-venda nem distribuição gratuita.",
    feesUse: `Taxa de ${pct(p.tradingFee)} por negociação: ${pct(p.protocolFee)} para a Meteora, ${pct(p.creatorWalletRate)} para a carteira de operação e ${pct(p.treasuryWalletRate)} para a tesouraria. Reclamadas em cadência semanal e publicadas na aba Acompanhamento.`,
  };
}

export const site: StepDef = {
  id: "site",
  async run({ run }) {
    const b = run.brief;
    const walletsStep = run.steps.find((s) => s.id === "carteiras")!.output as { creator?: string; treasury?: string };
    const ident = run.steps.find((s) => s.id === "identidade")!.output as { accent: string; hostname: string | null };
    const existing = await getProject(run.slug);
    const input: ProjectInput = {
      slug: run.slug,
      name: b.name,
      ticker: b.ticker,
      tagline: b.theme,
      about: b.about,
      accent: ident.accent,
      stage: existing?.stage ?? "comunidade",
      network: "solana",
      mint: existing?.mint ?? "",
      launchpad: "outro",
      links: { site: ident.hostname ? `https://${ident.hostname}` : `${PUBLIC_URL}/p/${run.slug}`, x: b.links.x ?? "", telegram: b.links.telegram ?? "", discord: b.links.discord ?? "" },
      wallets: [
        ...(walletsStep.creator ? [{ address: walletsStep.creator, role: "operacao" as const, label: "Operação (criador do pool)", evidenceUrl: "" }] : []),
        ...(walletsStep.treasury ? [{ address: walletsStep.treasury, role: "tesouraria" as const, label: "Tesouraria (recebe taxas de parceiro)", evidenceUrl: "" }] : []),
      ],
      supply: {
        total: 1_000_000_000,
        allocations: [
          { name: "Curva e mercado", pct: 100 - b.teamAllocationPct, vesting: "" },
          ...(b.teamAllocationPct > 0 ? [{ name: "Equipe", pct: b.teamAllocationPct, vesting: `${b.teamVestingMonths} meses lineares após graduação` }] : []),
        ],
      },
      policies: policiesFor(b),
      launch: {
        venue: "meteora-dbc",
        tradingFeeBps: b.tradingFeeBps,
        creatorSharePct: b.creatorSharePct,
        initialMarketCapSol: b.initialMarketCapSol,
        migrationMarketCapSol: b.migrationMarketCapSol,
      },
      hostnames: ident.hostname ? [ident.hostname] : [],
      runId: run.id,
      tracking: false,
    };
    const project = existing ? await updateProject(run.slug, input) : await createProject(input);
    return {
      status: "concluido",
      output: { url: `${PUBLIC_URL}/p/${project.slug}`, hostname: ident.hostname },
      log: [`${existing ? "Atualizado" : "Publicado"}: ${PUBLIC_URL}/p/${project.slug}`, "Página de fatos e riscos, carteiras por função, alocações e políticas geradas do brief."],
    };
  },
};

export const dominio: StepDef = {
  id: "dominio",
  async run({ run, log }) {
    if (!run.brief.wantOwnDomain) return { status: "pulado", log: ["Domínio próprio desativado no brief; o site segue no subdomínio do Farol."] };
    if (!porkbunConfigured()) {
      return { status: "pulado", log: ["Sem PORKBUN_API_KEY/PORKBUN_SECRET_KEY: não é possível registrar domínio. O site segue no subdomínio. Adicione as chaves e repita o passo."], output: { skippedReason: "sem-chaves" } };
    }
    const max = envNum("PORKBUN_MAX_USD", 3);
    const candidates = [`${run.slug}.xyz`, `${run.slug}sol.xyz`, `get${run.slug}.xyz`, `${run.slug}.fun`];
    for (const d of candidates) {
      const c = await checkDomain(d).catch((e) => ({ available: false, premium: false, priceUsd: NaN, renewalUsd: NaN, error: String(e) }));
      await log(`${d}: ${c.available ? `disponível por US$ ${c.priceUsd.toFixed(2)} (renova a US$ ${c.renewalUsd.toFixed(2)})` : "indisponível"}`);
      if (!c.available || c.premium || !(c.priceUsd <= max)) continue;
      await registerDomain(d, c.priceUsd, { dryRun: true });
      await registerDomain(d, c.priceUsd);
      await addCost(run.id, `Domínio ${d} (1º ano)`, c.priceUsd);
      const ip = env("FAROL_PUBLIC_IP");
      if (ip) {
        await createDnsRecord(d, { type: "A", content: ip });
        await createDnsRecord(d, { type: "CNAME", name: "www", content: d });
        await log(`DNS: A → ${ip}, www → ${d}`);
      } else {
        await log("FAROL_PUBLIC_IP não definido: registre o DNS manualmente apontando para a VM.");
      }
      const p = await getProject(run.slug);
      if (p) await updateProject(run.slug, { hostnames: Array.from(new Set([...(p.hostnames ?? []), d, `www.${d}`])), links: { ...p.links, site: `https://${d}` } });
      return {
        status: "concluido",
        output: { domain: d, priceUsd: c.priceUsd, renewalUsd: c.renewalUsd, renewsAt: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10) },
        log: [`Registrado ${d}. TLS: o nginx/Caddy da VM emite o certificado quando o DNS propagar.`],
      };
    }
    return { status: "pulado", log: [`Nenhum candidato disponível até US$ ${max}. O site segue no subdomínio.`] };
  },
};

function socialKit(run: { slug: string; brief: BriefParsed }, siteUrl: string) {
  const b = run.brief;
  const p = previewCurve(b);
  return {
    bio: `${b.name} ($${b.ticker}) — ${b.theme}. Fatos, carteiras e taxas publicados em ${siteUrl}. Sem promessa de preço.`,
    announcement: `${b.name} ($${b.ticker}) está no ar.\n\n${b.theme}\n\nO que é público: oferta fixa de 1 bi, autoridades revogadas, taxa de ${pct(p.tradingFee)} por negociação (${pct(p.creatorWalletRate + p.treasuryWalletRate)} para o projeto), liquidez 100% travada após a graduação. Carteiras da equipe declaradas.\n\nEndereço oficial e tudo mais: ${siteUrl}`,
    calendar: [
      "D0 — anúncio com link do site e endereço oficial do contrato (o único canal onde o endereço aparece primeiro).",
      "D1 — post: como funciona a taxa e para onde vai cada parte (gráfico simples).",
      "D2 — post: carteiras da equipe, por função, com links no explorador.",
      "D3 — encontro ao vivo (Space/Telegram) de 30 min: perguntas e objeções.",
      "D5 — relatório da semana: volume, taxas reclamadas, custos, próximos passos.",
      "D7 — publicação do primeiro claim de taxas com a transação.",
      "Semanal — mesmo relatório, mesmo horário. Sem contagem regressiva, sem 'última chance'.",
    ],
    telegramDescription: `${b.name} — canal oficial. Regras: sem promessa de preço, sem pedido de compra, endereço do contrato só em ${siteUrl}. Equipe identificada.`,
    rules: ["Uma conta oficial por rede, declarada no site.", "Sem contas alternativas, sem bots de engajamento, sem compra de seguidores.", "Toda métrica publicada tem fonte e horário."],
  };
}

export const social: StepDef = {
  id: "social",
  async run({ run, log }) {
    const siteOut = run.steps.find((s) => s.id === "site")!.output as { url: string };
    const dom = run.steps.find((s) => s.id === "dominio")!.output as { domain?: string };
    const siteUrl = dom.domain ? `https://${dom.domain}` : siteOut.url;
    const kit = socialKit(run, siteUrl);
    const out: Record<string, unknown> = { kit };
    if (xConfigured()) {
      try {
        const t = await postTweet(kit.announcement);
        out.xPostId = t.id;
        await log(`Publicado na conta oficial do X (id ${t.id}).`);
      } catch (e) {
        await log(`X: não publicou (${e instanceof Error ? e.message : e}). Kit pronto para copiar.`);
      }
    } else {
      await log("Sem chaves do X: kit gerado para publicar à mão. Para automatizar, conecte a conta oficial (X_API_*).");
    }
    return { status: "concluido", output: out, log: ["Kit: bio, anúncio, calendário de 7 dias, descrição do Telegram e regras de conduta."] };
  },
};

export const curva: StepDef = {
  id: "curva",
  async run({ run }) {
    const p = previewCurve(run.brief);
    const uri = `${PUBLIC_URL}/api/projects/${run.slug}/metadata`;
    return {
      status: "concluido",
      output: { preview: p, metadataUri: uri },
      log: [
        `Preço inicial ${p.initialPriceSol.toExponential(2)} SOL; graduação em ~${p.solToGraduateApprox?.toFixed(1) ?? "?"} SOL captados (market cap ${run.brief.migrationMarketCapSol} SOL).`,
        `Taxa ${pct(p.tradingFee)}: Meteora ${pct(p.protocolFee)} · operação ${pct(p.creatorWalletRate)} · tesouraria ${pct(p.treasuryWalletRate)}.`,
        `Metadados do token: ${uri}`,
      ],
    };
  },
};

export const lancamento: StepDef = {
  id: "lancamento",
  async run({ run, log, input }) {
    const project = await getProject(run.slug);
    if (!project) return { status: "falhou", error: "Projeto não encontrado." };
    if (project.mint) return { status: "concluido", output: { mint: project.mint, already: true }, log: ["Token já emitido; nada a fazer."] };

    const wallets = run.steps.find((s) => s.id === "carteiras")!.output as { creator: string; treasury: string };
    const curvaOut = run.steps.find((s) => s.id === "curva")!.output as { preview: ReturnType<typeof previewCurve>; metadataUri: string };
    const needSol = curvaOut.preview.estimatedRentSol + 0.02;

    if (!envBool("FAROL_LAUNCH_ENABLED")) {
      return { status: "espera", needs: "Lançamento on-chain desligado. Defina FAROL_LAUNCH_ENABLED=1 no .env da VM e repita.", action: "repetir", output: { needSol, creator: wallets.creator } };
    }
    const balance = await solBalance(wallets.creator);
    await log(`Saldo da carteira de operação: ${balance.toFixed(4)} SOL (necessário ≥ ${needSol.toFixed(2)}).`);
    if (balance < needSol) {
      const from = env("FAROL_OWNER_WALLET") ? ` a partir da carteira principal (${env("FAROL_OWNER_WALLET")})` : " pela sua Phantom";
      return { status: "espera", needs: `Envie pelo menos ${needSol.toFixed(2)} SOL para a carteira de operação ${wallets.creator}${from} e repita.`, action: "repetir", output: { needSol, creator: wallets.creator, balance } };
    }
    const confirmed = run.brief.autoLaunch || input?.confirm === true;
    if (!confirmed) {
      return { status: "espera", needs: "Confirme o lançamento. Gasta SOL real e cria o token na mainnet; não dá para desfazer.", action: "confirmar-lancamento", output: { needSol, creator: wallets.creator, balance } };
    }

    const creator = await loadKeypair(wallets.creator);
    const treasury = await loadKeypair(wallets.treasury);
    await log("Enviando transação 1/2: configuração da curva…");
    const r = await launchOnDbc({ brief: run.brief, creator, treasury, name: run.brief.name, symbol: run.brief.ticker, uri: curvaOut.metadataUri });
    await log(`Config ${r.configAddress} (tx ${r.signatures.config})`);
    await log(`Pool ${r.poolAddress} · mint ${r.mint} (tx ${r.signatures.pool})`);
    await updateProject(run.slug, {
      mint: r.mint,
      stage: "lancado",
      launch: { ...project.launch!, configAddress: r.configAddress, poolAddress: r.poolAddress, launchedAt: new Date().toISOString(), txSignature: r.signatures.pool },
    });
    await startTrack(run.slug, r.mint);
    await addEvent(run.slug, "lancado", `Token ${r.mint} criado na Meteora DBC (pool ${r.poolAddress}).`);
    return { status: "concluido", output: { ...r }, log: ["Token no ar. O site já lê preço, liquidez e autoridades ao vivo."] };
  },
};

export const listagem: StepDef = {
  id: "listagem",
  async run({ run, log }) {
    const project = await getProject(run.slug);
    const mint = project?.mint;
    if (!mint) return { status: "falhou", error: "Sem mint; o lançamento não concluiu." };
    const pairs = await getPairs(mint);
    const indexed = pairs.ok && pairs.data.length > 0;
    await log(indexed ? `Indexado no DEX Screener: ${pairs.data[0].dexId}.` : "Ainda não indexado no DEX Screener (normal nos primeiros minutos; o monitor registra quando aparecer).");
    const links = {
      dexscreener: `https://dexscreener.com/solana/${mint}`,
      jupiter: `https://jup.ag/tokens/${mint}`,
      solscan: `https://solscan.io/token/${mint}`,
      meteora: project?.launch?.poolAddress ? `https://www.meteora.ag/dbc/${project.launch.poolAddress}` : "https://www.meteora.ag",
      birdeye: `https://birdeye.so/token/${mint}?chain=solana`,
    };
    const manual = [
      "Jupiter Verify (lista verificada): https://verify.jup.ag — exige site, X e mint; gratuito.",
      "CoinGecko: formulário de listagem — só após 48 h de volume consistente e 500+ holders reais.",
      "DEX Screener Enhanced Token Info: pago (≈ US$ 299); só faz sentido com volume orgânico.",
      "CoinMarketCap: dossiê quando houver 30 dias de histórico e liquidez estável.",
    ];
    return { status: "concluido", output: { indexed, links, manual }, log: ["Links públicos e lista de submissões manuais prontos."] };
  },
};

export const acompanhamento: StepDef = {
  id: "acompanhamento",
  async run({ run, log }) {
    const project = await getProject(run.slug);
    if (!project?.mint) return { status: "falhou", error: "Sem mint para acompanhar." };
    await updateProject(run.slug, { tracking: true });
    await startTrack(run.slug, project.mint);
    for (const c of run.costsUsd) await addTrackCost(run.slug, c.item, c.usd);
    await tick();
    await log("Monitor ligado: leitura a cada minuto, eventos de ciclo de vida e P&L em caixa.");
    return { status: "concluido", output: { trackUrl: `${PUBLIC_URL}/app/iniciar/${run.id}` } };
  },
};

export const STEPS: StepDef[] = [identidade, carteiras, site, dominio, social, curva, lancamento, listagem, acompanhamento];

/** Reclama taxas (curva) para as duas carteiras; registra em caixa com a cotação informada. */
export async function claimFeesForProject(slug: string, solUsd: number | null) {
  const project = await getProject(slug);
  if (!project?.mint) throw new Error("Projeto sem token.");
  const ws = await listWallets(slug);
  const creator = ws.find((w) => w.role === "operacao");
  const treasury = ws.find((w) => w.role === "tesouraria");
  if (!creator || !treasury) throw new Error("Carteiras do projeto não estão no cofre.");
  const r = await claimDbcFees({ mint: project.mint, creator: await loadKeypair(creator.pubkey), treasury: await loadKeypair(treasury.pubkey) });
  const sol = r.creatorSol + r.partnerSol;
  await addEvent(slug, "claim", `Taxas reclamadas: ${sol.toFixed(4)} SOL (operação ${r.creatorSol.toFixed(4)}, tesouraria ${r.partnerSol.toFixed(4)}).`);
  return { ...r, sol, usd: solUsd ? sol * solUsd : null };
}
