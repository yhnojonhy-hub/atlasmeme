# Estaleiro

Operação de lançamento na Solana. O Estaleiro monta o site público de um projeto
(mint, pool, carteiras declaradas, taxas do criador, tesouraria) e dá ao operador um painel com
abas para medir o piloto: mercado, taxas, carteiras, comunidade, negócio, risco, lançamento e APIs.

Cada número vem com fonte e horário. FDV não é caixa. Carteiras da equipe são declaradas por função,
nunca apresentadas como usuários independentes.

## Iniciar projeto (pipeline automático)

Na aba **Iniciar**, um brief de três linhas (nome, ticker, tema) dispara a sequência completa. Cada
passo é persistido em `data/runs.json`, é idempotente e pode ser repetido; o que depende de você para
em **espera** e diz o que falta.

| # | Passo | O que faz | Precisa de |
|---|---|---|---|
| 1 | Identidade | slug, cor, hostname `slug.FAROL_BASE_DOMAIN` | — |
| 2 | Carteiras | cria "operação" e "tesouraria" (ed25519, cifradas AES-256-GCM em `data/vault/`) | `FAROL_SECRET` |
| 3 | Site | publica `/p/slug` com carteiras declaradas, alocações, políticas e avisos | — |
| 4 | Domínio | verifica, registra `.xyz` (≤ `PORKBUN_MAX_USD`) e aponta DNS para `FAROL_PUBLIC_IP` | chaves Porkbun (senão pula) |
| 5 | Social | bio, anúncio, calendário de 7 dias, regras; publica o anúncio na conta oficial do X | chaves X (senão só gera o kit) |
| 6 | Curva | configura a Meteora DBC: taxa fixa (padrão 2%), parte da operação/tesouraria, market cap inicial e de graduação, migração para DAMM v2 com 100% da LP travada, vesting da equipe | — |
| 7 | Lançamento | cria config + pool on-chain, grava mint, inicia acompanhamento | `FAROL_LAUNCH_ENABLED=1`, SOL na carteira de operação, confirmação |
| 8 | Listagem | confirma indexação no DEX Screener, gera links (Jupiter, Solscan, Meteora, Birdeye) e lista submissões manuais | — |
| 9 | Acompanhamento | monitor a cada minuto: preço, liquidez, progresso da curva, taxas acumuladas, P&L em caixa, alertas | — |

## Acesso, administração e financeiro

**Login por e-mail e senha.** Ativo quando há `FAROL_SECRET` (assina o cookie de sessão httpOnly, HMAC-SHA256, 14 dias).
Senhas ficam só como hash scrypt em `data/users.json`. Primeiro administrador: `FAROL_ADMIN_EMAIL` + `FAROL_ADMIN_PASSWORD`
no `.env`, reinicie, entre em `/entrar` e remova a senha do `.env`; o painel pede a troca no primeiro acesso.
Scripts usam o header `x-farol-token` (`FAROL_ADMIN_TOKEN`). Padrão do guia oficial do Next.js 16: o `proxy.ts` só
valida a assinatura (checagem otimista), o layout de `/app` e cada rota de API fazem a verificação autoritativa.

| Área | Quem | O que |
|---|---|---|
| `/app/admin` Visão geral | admin | todas as moedas, sites, redes, carteiras e execuções criadas; custos e caixa por projeto; usuários (criar, papel, redefinir senha, remover) |
| `/app/financeiro` | admin | lucro em caixa, a reclamar, custos por projeto (automação + manuais), infra fixa mensal rateada por dia, resultado líquido, saldo das carteiras |
| `/app/iniciar`, demais abas | admin e operador | operar projetos |
| `/app/conta` | todos | trocar a própria senha |
| `/p/<slug>`, leituras `GET /api/*` | público | sites e dados públicos |

Papéis: **admin** (tudo) e **operador** (opera projetos, não vê financeiro nem usuários). Sempre deve existir ao menos um admin.
As APIs que escrevem ou gastam (`/api/runs*`, `/api/wallets`, `/api/users`, `/api/finance`, `/api/projects/*/claim`,
`POST/PATCH /api/projects*`) exigem sessão; `/api/users` e `/api/finance` exigem admin.

O monitor roda dentro do processo (`src/instrumentation.ts`) e grava em `data/track/<slug>.json`. O botão
**Reclamar taxas** envia as taxas acumuladas para as carteiras de operação e tesouraria.

Modelo de referência: [h081.xyz](https://www.h081.xyz/) — site estático barato, domínio .xyz, Meteora DBC
com 2% de taxa, LP travada após graduação, página de fatos e riscos, carteiras declaradas.

### Como a sua carteira entra

O Estaleiro **não importa chaves privadas de carteiras pessoais**. O fluxo é:

1. Sua Phantom/Ledger é a **carteira principal**: informe só o endereço público em `FAROL_OWNER_WALLET`. Ela aparece no
   Financeiro com saldo.
2. Cada projeto ganha duas carteiras próprias (operação e tesouraria), geradas e cifradas pelo cofre. O passo 7 pede que
   você envie ~0,1 SOL da carteira principal para a de operação; só essa carteira assina o lançamento.
3. As taxas caem nas carteiras do projeto; o repasse para a carteira principal é uma transferência normal (Phantom ou
   exportando a chave do cofre com `FAROL_SECRET`).

Se uma chave privada vazar (colada em chat, e-mail, print), a carteira está comprometida: crie outra e mova o saldo.

## O que o Estaleiro não faz

- Não cria volume, não distribui carteiras para parecer descentralizado, não promete listagem.
- Não cria contas em redes sociais; só publica, via API, na conta oficial que você conectou.
- Só assina transações do próprio lançamento e da reclamação de taxas, com carteiras que ele mesmo criou e cifrou.
  Chaves nunca saem do servidor em texto claro, exceto por exportação explícita com `FAROL_SECRET`.

## Rodar localmente

```bash
npm install
cp .env.example .env        # opcional: HELIUS_API_KEY
npm run dev                 # http://localhost:3000
```

## Estrutura

```
src/app/                 páginas (App Router)
  page.tsx               início: hero + "cole o mint"
  app/<aba>/             painel: mercado, fees, carteiras, comunidade, negocio, risco, lancamento, apis
    admin/               visão geral do administrador (macro) + usuários
    financeiro/          lucro, custos por projeto, infra fixa, resultado líquido
    conta/               trocar senha
    iniciar/             botão "Iniciar projeto", lista de execuções e progresso ao vivo
  entrar/                login por e-mail e senha
  novo/                  assistente manual de site de projeto (4 passos)
  p/[slug]/              site público gerado por projeto (também servido por slug.FAROL_BASE_DOMAIN)
  api/                   BFF: market, token, fees, health, projects, runs, wallets
src/proxy.ts             mapeia hostname (subdomínio ou domínio próprio) → /p/slug
src/instrumentation.ts   liga o monitor contínuo no arranque
src/lib/adapters/        uma integração por arquivo, com contrato Sourced<T> (fonte, horário, latência)
src/lib/launcher/        Run/Step, runner sequencial e os 9 passos
src/lib/wallets/vault.ts carteiras cifradas
src/lib/users.ts         usuários (hash scrypt) · src/lib/auth.ts sessão assinada · src/lib/finance.ts consolidação
src/lib/tracker/         snapshots, eventos, P&L
src/lib/projects/        schema (zod) e store (JSON em disco, volume no Docker)
src/lib/metrics/         matemática do negócio (funções puras)
data/                    projects.json, hostnames.json, runs.json, users.json, finance.json, vault/, track/
```

## Integrações

| Integração | Papel | Chave |
|---|---|---|
| Solana RPC (Helius ou público) | oferta, decimais, autoridades do mint | opcional (`HELIUS_API_KEY`) |
| DEX Screener | pares, preço, liquidez, volume | não |
| Pump.fun fees | tabela oficial de taxas por fase e market cap | não (estática, versionada) |
| Meteora DBC (SDK) | criar config/pool, ler progresso e taxas, reclamar taxas | `FAROL_LAUNCH_ENABLED=1` + SOL |
| Cofre local | gerar e cifrar carteiras | `FAROL_SECRET` |
| Porkbun | verificar/registrar domínio e DNS | `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY` |
| X API v2 | publicar anúncio na conta oficial | `X_API_KEY/SECRET`, `X_ACCESS_TOKEN/SECRET` |

## Deploy na VM (Docker)

```bash
# na VM
bash deploy/vm-setup.sh
cp .env.example .env && nano .env      # HELIUS_API_KEY, FAROL_PORT, FAROL_PUBLIC_URL
docker compose up -d --build
curl -s 'http://localhost:3030/api/health?quick=1'   # liveness (sem consultar terceiros)
curl -s  http://localhost:3030/api/health             # estado de cada integração
```

O build do `npm ci` usa a rede do host (`build.network: host`) e o container usa DNS IPv4 explícito
(`1.1.1.1`, `8.8.8.8`): evita falhas `EAI_AGAIN` em VMs cujo DNS upstream é só IPv6.

Do Windows: `.\deploy\deploy-from-windows.ps1 -Host <ip> -User <usuario>`.

O container publica em `FAROL_PORT` (padrão 3030). Para expor um domínio:

- VM com nginx no host (caso atual): use `deploy/nginx-farol.conf`, troque `SEU_DOMINIO`, habilite o site e rode
  `certbot --nginx -d SEU_DOMINIO`.
- VM sem proxy: `docker compose --profile proxy up -d` com `FAROL_DOMAIN=seu-dominio.com`; o Caddy emite o certificado.

Em ambos, defina `FAROL_PUBLIC_URL=https://seu-dominio.com` no `.env`.

### Subdomínio por projeto

Com `FAROL_BASE_DOMAIN=seu-dominio.com`, cada projeto responde em `https://<slug>.seu-dominio.com`:

1. DNS: registro `A` para `*.seu-dominio.com` → IP da VM.
2. Certificado wildcard no nginx do host (`certbot --nginx -d seu-dominio.com -d '*.seu-dominio.com'` com desafio DNS)
   e `server_name seu-dominio.com *.seu-dominio.com;` no `deploy/nginx-farol.conf`.
3. Domínios próprios registrados pelo passo 4 entram em `data/hostnames.json` e são servidos do mesmo jeito
   (certificado via `certbot --nginx -d <dominio>` depois que o DNS propagar).

## Latência

- Cache por tipo de dado (pares 15 s, mint 5 min, saúde 30 s), com hora da leitura visível.
- Uma rota BFF por aba; timeouts de 6–7 s; falha vira estado "pendente", nunca zero.
- Front e API no mesmo processo; Caddy com compressão e cache imutável para estáticos.
