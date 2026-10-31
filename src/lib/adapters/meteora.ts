import {
  ActivationType,
  BaseFeeMode,
  buildCurveWithMarketCap,
  CollectFeeMode,
  DammV2DynamicFeeMode,
  deriveDbcPoolAddress,
  DynamicBondingCurveClient,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, type Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { rpcUrl } from "./solana";

/**
 * Meteora Dynamic Bonding Curve — launchpad permissionless com taxa definida pelo criador.
 * Papel no Farol: criar a configuração da curva, o pool (token + mercado), ler taxas acumuladas e reclamá-las.
 * Não faz: comprar o próprio token, criar carteiras "de terceiros", prometer graduação.
 * Fonte: https://docs.meteora.ag/core-products/dbc e SDK @meteora-ag/dynamic-bonding-curve-sdk.
 */
export const METEORA_DBC = {
  name: "Meteora DBC",
  url: "https://docs.meteora.ag/core-products/dbc",
  role: "Curva de lançamento com taxa própria; graduação para DAMM v2 com LP travada.",
  /** Parcela da taxa de negociação que fica com o protocolo Meteora na DBC. */
  protocolShare: 0.2,
};

export const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const TOTAL_SUPPLY = 1_000_000_000;

export type CurveBrief = {
  tradingFeeBps: number;
  creatorSharePct: number;
  initialMarketCapSol: number;
  migrationMarketCapSol: number;
  teamAllocationPct: number;
  teamVestingMonths: number;
};

export function buildLaunchConfig(b: CurveBrief): ConfigParameters {
  const teamTokens = Math.floor((TOTAL_SUPPLY * b.teamAllocationPct) / 100);
  const months = Math.max(1, b.teamVestingMonths);
  return buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: TOTAL_SUPPLY,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: { startingFeeBps: b.tradingFeeBps, endingFeeBps: b.tradingFeeBps, numberOfPeriod: 0, totalDuration: 0 },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: b.creatorSharePct,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: true,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        poolFeeBps: b.tradingFeeBps,
      },
    },
    // Toda a liquidez migrada fica travada para sempre (ninguém "fecha o pool").
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 100,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting:
      teamTokens > 0
        ? {
            totalLockedVestingAmount: teamTokens,
            numberOfVestingPeriod: months,
            cliffUnlockAmount: 0,
            totalVestingDuration: months * 30 * 86400,
            cliffDurationFromMigrationTime: 0,
          }
        : { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: ActivationType.Timestamp,
    initialMarketCap: b.initialMarketCapSol,
    migrationMarketCap: b.migrationMarketCapSol,
  });
}

/** Números legíveis para o operador antes de gastar 1 lamport. */
export function previewCurve(b: CurveBrief) {
  const cfg = buildLaunchConfig(b);
  const threshold = (cfg as unknown as { migrationQuoteThreshold?: BN }).migrationQuoteThreshold;
  const thresholdSol = threshold ? Number(threshold.toString()) / LAMPORTS_PER_SOL : null;
  const fee = b.tradingFeeBps / 10_000;
  const afterProtocol = fee * (1 - METEORA_DBC.protocolShare);
  return {
    totalSupply: TOTAL_SUPPLY,
    initialPriceSol: b.initialMarketCapSol / TOTAL_SUPPLY,
    migrationPriceSol: b.migrationMarketCapSol / TOTAL_SUPPLY,
    solToGraduateApprox: thresholdSol,
    tradingFee: fee,
    protocolFee: fee * METEORA_DBC.protocolShare,
    creatorWalletRate: afterProtocol * (b.creatorSharePct / 100),
    treasuryWalletRate: afterProtocol * (1 - b.creatorSharePct / 100),
    teamTokens: Math.floor((TOTAL_SUPPLY * b.teamAllocationPct) / 100),
    teamVestingMonths: b.teamVestingMonths,
    liquidityLockedPct: 100,
    /** Rent das contas (config + pool + mint + metadata) — estimativa conservadora. */
    estimatedRentSol: 0.08,
  };
}

/** Taxa efetiva por US$ de volume, somando as duas carteiras da equipe. */
export function teamFeeRate(tradingFeeBps: number) {
  return (tradingFeeBps / 10_000) * (1 - METEORA_DBC.protocolShare);
}

function connection() {
  return new Connection(rpcUrl(), "confirmed");
}

export async function solBalance(pubkey: string) {
  return (await connection().getBalance(new PublicKey(pubkey))) / LAMPORTS_PER_SOL;
}

async function send(tx: Transaction, signers: Keypair[]) {
  const conn = connection();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = signers[0].publicKey;
  return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
}

/**
 * Cria config + pool em duas transações assinadas pelas carteiras do cofre.
 * `creator` paga e é o pool creator; `treasury` é feeClaimer (parceiro) e leftoverReceiver.
 */
export async function launchOnDbc(args: {
  brief: CurveBrief;
  creator: Keypair;
  treasury: Keypair;
  name: string;
  symbol: string;
  uri: string;
}) {
  const client = new DynamicBondingCurveClient(connection(), "confirmed");
  const config = Keypair.generate();
  const baseMint = Keypair.generate();
  const params = buildLaunchConfig(args.brief);

  const tx1 = await client.partner.createConfig2({
    ...params,
    config: config.publicKey,
    feeClaimer: args.treasury.publicKey,
    leftoverReceiver: args.treasury.publicKey,
    quoteMint: NATIVE_MINT,
    payer: args.creator.publicKey,
  });
  const sigConfig = await send(tx1, [args.creator, config]);

  const tx2 = await client.creator.createPool({
    baseMint: baseMint.publicKey,
    config: config.publicKey,
    name: args.name,
    symbol: args.symbol,
    uri: args.uri,
    payer: args.creator.publicKey,
    poolCreator: args.creator.publicKey,
  });
  const sigPool = await send(tx2, [args.creator, baseMint]);

  const pool = deriveDbcPoolAddress(NATIVE_MINT, baseMint.publicKey, config.publicKey);
  return {
    mint: baseMint.publicKey.toBase58(),
    configAddress: config.publicKey.toBase58(),
    poolAddress: pool.toBase58(),
    signatures: { config: sigConfig, pool: sigPool },
  };
}

export type PoolStatus = {
  found: boolean;
  migrated: boolean;
  curveProgress: number | null;
  quoteReserveSol: number | null;
  fees: {
    creatorUnclaimedSol: number;
    creatorClaimedSol: number;
    partnerUnclaimedSol: number;
    partnerClaimedSol: number;
    totalTradingSol: number;
  } | null;
};

export async function poolStatus(mint: string): Promise<PoolStatus> {
  const client = new DynamicBondingCurveClient(connection(), "confirmed");
  const acc = await client.state.getPoolByBaseMint(new PublicKey(mint));
  if (!acc) return { found: false, migrated: false, curveProgress: null, quoteReserveSol: null, fees: null };
  const pool = acc.publicKey;
  // O SDK devolve { account: { poolState } }; versões anteriores devolviam os campos no topo.
  type RawState = { isMigrated: number; quoteReserve: BN; finishCurveTimestamp?: BN };
  const raw = acc.account as unknown as RawState & { poolState?: RawState };
  const state: RawState = raw.poolState ?? raw;
  const [progress, breakdown] = await Promise.all([
    client.state.getPoolQuoteTokenCurveProgress(pool).catch(() => null),
    client.state.getPoolFeeBreakdown(pool).catch(() => null),
  ]);
  const sol = (x?: BN) => (x ? Number(x.toString()) / LAMPORTS_PER_SOL : 0);
  return {
    found: true,
    migrated: Number(state.isMigrated) > 0 || (state.finishCurveTimestamp != null && !state.finishCurveTimestamp.isZero()),
    curveProgress: progress,
    quoteReserveSol: sol(state.quoteReserve),
    fees: breakdown
      ? {
          creatorUnclaimedSol: sol(breakdown.creator.unclaimedQuoteFee),
          creatorClaimedSol: sol(breakdown.creator.claimedQuoteFee),
          partnerUnclaimedSol: sol(breakdown.partner.unclaimedQuoteFee),
          partnerClaimedSol: sol(breakdown.partner.claimedQuoteFee),
          totalTradingSol: sol(breakdown.creator.totalQuoteFee) + sol(breakdown.partner.totalQuoteFee),
        }
      : null,
  };
}

/** Reclama as taxas acumuladas na fase de curva para as duas carteiras da equipe. */
export async function claimDbcFees(args: { mint: string; creator: Keypair; treasury: Keypair }) {
  const client = new DynamicBondingCurveClient(connection(), "confirmed");
  const acc = await client.state.getPoolByBaseMint(new PublicKey(args.mint));
  if (!acc) throw new Error("Pool não encontrado para este mint.");
  const pool = acc.publicKey;
  const b = await client.state.getPoolFeeBreakdown(pool);
  const out: { creator?: string; partner?: string; creatorSol: number; partnerSol: number } = {
    creatorSol: Number(b.creator.unclaimedQuoteFee.toString()) / LAMPORTS_PER_SOL,
    partnerSol: Number(b.partner.unclaimedQuoteFee.toString()) / LAMPORTS_PER_SOL,
  };
  if (b.creator.unclaimedQuoteFee.gtn(0)) {
    const tx = await client.creator.claimCreatorTradingFee({
      creator: args.creator.publicKey,
      payer: args.creator.publicKey,
      pool,
      maxBaseAmount: new BN(0),
      maxQuoteAmount: b.creator.unclaimedQuoteFee,
    });
    out.creator = await send(tx, [args.creator]);
  }
  if (b.partner.unclaimedQuoteFee.gtn(0)) {
    const tx = await client.partner.claimPartnerTradingFee({
      feeClaimer: args.treasury.publicKey,
      payer: args.treasury.publicKey,
      pool,
      maxBaseAmount: new BN(0),
      maxQuoteAmount: b.partner.unclaimedQuoteFee,
    });
    out.partner = await send(tx, [args.treasury]);
  }
  return out;
}
