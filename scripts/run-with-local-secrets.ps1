param(
  [string]$SecretsFile = "..\skills\coding plan\secrets.md"
)

$ErrorActionPreference = 'Stop'
$resolvedSecrets = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\$SecretsFile"))
if (-not (Test-Path -LiteralPath $resolvedSecrets)) {
  throw "Secrets file not found: $resolvedSecrets"
}

$activeProvider = $null
foreach ($rawLine in Get-Content -LiteralPath $resolvedSecrets) {
  $line = $rawLine.Trim()
  if (-not $line) { continue }
  if ($line -match '(?i)minimax') { $activeProvider = 'MINIMAX_API_KEY'; continue }
  if ($line -match '(?i)zai|glm|智谱') { $activeProvider = 'ZAI_API_KEY'; continue }
  if ($activeProvider -and -not [Environment]::GetEnvironmentVariable($activeProvider, 'Process')) {
    [Environment]::SetEnvironmentVariable($activeProvider, $line, 'Process')
    $activeProvider = $null
  }
}

if (-not $env:MINIMAX_API_KEY) { throw 'MINIMAX_API_KEY was not found in the local secrets file.' }
if (-not $env:ZAI_API_KEY) { throw 'ZAI_API_KEY was not found in the local secrets file.' }

npm run dsh:web
