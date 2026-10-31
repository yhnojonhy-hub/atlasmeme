# Envia o projeto para a VM e sobe os containers.
# Uso: .\deploy\deploy-from-windows.ps1 -Host 100.102.182.0 -User johny
# Requer: OpenSSH client (ssh/scp) no Windows e acesso por chave ou senha interativa.
param(
  [Parameter(Mandatory = $true)][string]$Host,
  [Parameter(Mandatory = $true)][string]$User,
  [string]$RemoteDir = "/opt/farol"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tar = Join-Path $env:TEMP "farol-deploy.tgz"

Write-Host "Empacotando..." -ForegroundColor Cyan
Push-Location $root
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env -czf $tar .
Pop-Location

Write-Host "Enviando para $User@${Host}:$RemoteDir ..." -ForegroundColor Cyan
ssh "$User@$Host" "mkdir -p $RemoteDir"
scp $tar "$User@${Host}:/tmp/farol-deploy.tgz"
ssh "$User@$Host" "tar -xzf /tmp/farol-deploy.tgz -C $RemoteDir && cd $RemoteDir && bash deploy/vm-setup.sh && ([ -f .env ] || cp .env.example .env) && docker compose up -d --build && sleep 5 && curl -s http://localhost/api/health | head -c 400"

Write-Host "`nPronto. Acesse http://$Host (ou o domínio configurado em FAROL_DOMAIN)." -ForegroundColor Green
