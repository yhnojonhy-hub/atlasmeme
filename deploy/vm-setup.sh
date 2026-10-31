#!/usr/bin/env bash
# Prepara uma VM Ubuntu/Debian para rodar o Farol em Docker.
# Uso (na VM): bash deploy/vm-setup.sh
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

sudo mkdir -p /opt/farol
sudo chown "$USER":"$USER" /opt/farol

echo "Docker pronto. Próximos passos:"
echo "  1) copie o repositório para /opt/farol (git clone ou rsync)"
echo "  2) cp .env.example .env && edite HELIUS_API_KEY, FAROL_PORT e FAROL_PUBLIC_URL"
echo "  3) docker compose up -d --build"
echo "  4) curl -s 'http://localhost:3030/api/health?quick=1'"
echo "  5) domínio: deploy/nginx-farol.conf (nginx do host) ou 'docker compose --profile proxy up -d' (Caddy)"
