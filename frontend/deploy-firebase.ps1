param(
  [string]$SITE    = "pink-manager-app",
  [string]$PROJECT = "juane-soc-prod",
  [string]$DIST    = "$PSScriptRoot\dist"
)

$ErrorActionPreference = "Stop"

# ── Token via gcloud ──────────────────────────────────────────────────────────
$TOKEN = (gcloud auth print-access-token 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Falha ao obter token do gcloud: $TOKEN" }
$TOKEN = $TOKEN.Trim()

$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

Write-Host ">> Iniciando deploy para $SITE..." -ForegroundColor Cyan

# ── 1. Criar versão ───────────────────────────────────────────────────────────
$body = '{"config":{"rewrites":[{"glob":"**","path":"/index.html"}]}}'
try {
  $vResp = Invoke-RestMethod `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/$SITE/versions" `
    -Method POST -Headers $headers -Body $body
} catch {
  $detail = $_.ErrorDetails.Message
  throw "Erro ao criar versao: $($_.Exception.Message)`n$detail"
}
$versionName = $vResp.name
Write-Host "   Versão criada: $versionName" -ForegroundColor Gray

# ── 2. Mapear arquivos e calcular SHA256 ──────────────────────────────────────
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$fileMap   = @{}  # "/path" => "hash"
$hashToPath = @{} # "hash"  => fullPath

Get-ChildItem -Path $DIST -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($DIST.Length).Replace("\", "/")
  if (-not $rel.StartsWith("/")) { $rel = "/$rel" }
  $stream = [System.IO.File]::OpenRead($_.FullName)
  $bytes  = $sha256.ComputeHash($stream)
  $stream.Close()
  $hash = ([System.BitConverter]::ToString($bytes)).Replace("-","").ToLower()
  $fileMap[$rel]     = $hash
  $hashToPath[$hash] = $_.FullName
}

Write-Host "   $($fileMap.Count) arquivos mapeados" -ForegroundColor Gray

# ── 3. populateFiles ──────────────────────────────────────────────────────────
$popBody = (@{ files = $fileMap } | ConvertTo-Json -Depth 5 -Compress)
$popResp = Invoke-RestMethod `
  -Uri "https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles" `
  -Method POST -Headers $headers -Body $popBody
$uploadUrl     = $popResp.uploadUrl
$requiredHashes = @($popResp.uploadRequiredHashes)
Write-Host "   $($requiredHashes.Count) arquivos para upload" -ForegroundColor Gray

# ── 4. Upload dos arquivos necessários ────────────────────────────────────────
$uploadHeaders = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/octet-stream" }
foreach ($hash in $requiredHashes) {
  $path  = $hashToPath[$hash]
  $bytes = [System.IO.File]::ReadAllBytes($path)
  Invoke-RestMethod -Uri "$uploadUrl/$hash" -Method POST -Headers $uploadHeaders -Body $bytes | Out-Null
  Write-Host "   Uploaded: $(Split-Path $path -Leaf)" -ForegroundColor DarkGray
}

# ── 5. Finalizar versão ───────────────────────────────────────────────────────
Invoke-RestMethod `
  -Uri "https://firebasehosting.googleapis.com/v1beta1/$versionName" `
  -Method PATCH -Headers $headers -Body '{"status":"FINALIZED"}' | Out-Null

# ── 6. Criar release ──────────────────────────────────────────────────────────
$encoded = [uri]::EscapeDataString($versionName)
Invoke-RestMethod `
  -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/$SITE/releases?versionName=$encoded" `
  -Method POST -Headers $headers -Body "{}" | Out-Null

Write-Host ""
Write-Host ">> Deploy concluido!" -ForegroundColor Green
Write-Host "   https://$SITE.web.app" -ForegroundColor Green
