# Farol

Transparência para comunidades e tokens na Solana. O Farol monta o site público de um projeto
(mint, pool, carteiras declaradas, taxas do criador, tesouraria) e dá ao operador um painel com
abas para medir o piloto: mercado, taxas, carteiras, comunidade, negócio, risco, lançamento e APIs.

Cada número vem com fonte e horário. FDV não é caixa. Carteiras da equipe são declaradas por função,
nunca apresentadas como usuários independentes.

## O que o Farol não faz

- Não emite token nem envia transações. Só leitura on-chain.
- Não cria volume, não distribui carteiras para parecer descentralizado, não promete listagem.
- Não custodia ativos. Nenhuma chave privada passa pelo sistema.

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
  novo/                  assistente de criação de site de projeto (4 passos)
  p/[slug]/              site público gerado por projeto
  api/                   BFF: market, token, fees, health, projects
src/lib/adapters/        uma integração por arquivo, com contrato Sourced<T> (fonte, horário, latência)
src/lib/projects/        schema (zod) e store (JSON em disco, volume no Docker)
src/lib/metrics/         matemática do negócio (funções puras)
data/projects.json       seed do primeiro projeto
```

## Integrações

| Integração | Papel | Chave |
|---|---|---|
| Solana RPC (Helius ou público) | oferta, decimais, autoridades do mint | opcional (`HELIUS_API_KEY`) |
| DEX Screener | pares, preço, liquidez, volume | não |
| Pump.fun fees | tabela oficial de taxas por fase e market cap | não (estática, versionada) |

## Deploy na VM (Docker)

```bash
# na VM
bash deploy/vm-setup.sh
cp .env.example .env && nano .env      # HELIUS_API_KEY, FAROL_DOMAIN
docker compose up -d --build
curl -s http://localhost/api/health
```

Do Windows: `.\deploy\deploy-from-windows.ps1 -Host <ip> -User <usuario>`.

Quando o DNS apontar para a VM, defina `FAROL_DOMAIN=seu-dominio.com` e `FAROL_PUBLIC_URL=https://seu-dominio.com`;
o Caddy emite o certificado sozinho.

## Latência

- Cache por tipo de dado (pares 15 s, mint 5 min, saúde 30 s), com hora da leitura visível.
- Uma rota BFF por aba; timeouts de 6–7 s; falha vira estado "pendente", nunca zero.
- Front e API no mesmo processo; Caddy com compressão e cache imutável para estáticos.
