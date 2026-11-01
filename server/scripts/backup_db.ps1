# scripts/backup_db.ps1
# Automated, consistent database backup using mysqldump with single-transaction consistency.
param (
    [string]$HostName = "",
    [int]$Port = 3306,
    [string]$User = "",
    [string]$Password = "",
    [string]$Database = "",
    [switch]$UseSsl = $false,
    [string]$OutputDir = "_private_docs/backups"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$repoRoot\server")) {
    $repoRoot = (Get-Location).Path
}

# Auto-detect from server/.env if parameters not provided
if (-not $HostName -or -not $User) {
    $envFile = "$repoRoot\server\.env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match 'DATABASE_URL="?mysql(?:\+pymysql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^"?]+)') {
            if (-not $User) { $User = $Matches[1] }
            if (-not $Password) { $Password = [System.Uri]::UnescapeDataString($Matches[2]) }
            if (-not $HostName) { $HostName = $Matches[3] }
            if ($Matches[4] -and -not $Port) { $Port = [int]$Matches[4] }
            if (-not $Database) { $Database = $Matches[5] }
        }
    }
}

if (-not $HostName) { $HostName = "127.0.0.1" }
if (-not $User) { $User = "root" }
if (-not $Database) { $Database = "event_rental" }

if (-not (Test-Path $OutputDir)) {
    $OutputDir = "$repoRoot\$OutputDir"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = Join-Path $OutputDir "backup_${Database}_${timestamp}.sql"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Rent4Fraction Database Backup" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Host     : $HostName`:$Port" -ForegroundColor White
Write-Host "Database : $Database" -ForegroundColor White
Write-Host "User     : $User" -ForegroundColor White
Write-Host "Output   : $dumpFile" -ForegroundColor Yellow

$dumpArgs = @(
    "-h", $HostName,
    "-P", "$Port",
    "-u", $User,
    "--single-transaction",
    "--quick",
    "--default-character-set=utf8mb4",
    "--no-tablespaces",
    "--routines",
    "--triggers"
)

if ($Password) {
    $dumpArgs += "-p$Password"
}

if ($UseSsl -or $HostName -notmatch "^(127\.0\.0\.1|localhost)$") {
    $dumpArgs += "--ssl-mode=REQUIRED"
}

$dumpArgs += $Database

& mysqldump @dumpArgs | Out-File -FilePath $dumpFile -Encoding utf8

if ($LASTEXITCODE -eq 0 -and (Test-Path $dumpFile)) {
    $size = (Get-Item $dumpFile).Length
    Write-Host "SUCCESS: Database backup written cleanly ($size bytes)." -ForegroundColor Green
    Write-Host "Path: $dumpFile" -ForegroundColor Green
} else {
    Write-Error "mysqldump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

