# scripts/restore_db.ps1
# Restores a SQL dump into a designated MySQL database with interactive confirmation.
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "",
    [string]$Password = "",
    [string]$TargetDatabase = "event_rental_restore_scratch",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$repoRoot\server")) {
    $repoRoot = (Get-Location).Path
}

if (-not (Test-Path $BackupFile)) {
    if (Test-Path "$repoRoot\$BackupFile") {
        $BackupFile = "$repoRoot\$BackupFile"
    } else {
        Write-Error "Backup file not found at: $BackupFile"
        exit 1
    }
}

if (-not $User -or -not $Password) {
    $envFile = "$repoRoot\server\.env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match 'DATABASE_URL="?mysql(?:\+pymysql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^"?]+)') {
            if (-not $User) { $User = $Matches[1] }
            if (-not $Password) { $Password = [System.Uri]::UnescapeDataString($Matches[2]) }
            if ($Matches[3] -and -not $HostName) { $HostName = $Matches[3] }
            if ($Matches[4] -and -not $Port) { $Port = [int]$Matches[4] }
        }
    }
}
if (-not $User) { $User = "root" }

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Rent4Fraction Database Restore" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Source Backup   : $BackupFile" -ForegroundColor Yellow
Write-Host "Target Host     : $HostName`:$Port" -ForegroundColor White
Write-Host "Target Database : $TargetDatabase" -ForegroundColor White
Write-Host "Target User     : $User" -ForegroundColor White

if (-not $Force) {
    Write-Host "CAUTION: This will execute all statements in the backup file against '$TargetDatabase'!" -ForegroundColor Red
    $confirm = Read-Host "Type 'RESTORE' to proceed"
    if ($confirm -ne "RESTORE") {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

$mysqlArgs = @(
    "-h", $HostName,
    "-P", "$Port",
    "-u", $User,
    "--default-character-set=utf8mb4"
)

if ($Password) {
    $mysqlArgs += "-p$Password"
}

# Create target scratch database if it doesn't exist
$createDbSql = "CREATE DATABASE IF NOT EXISTS $TargetDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& mysql @mysqlArgs -e $createDbSql

$mysqlArgs += $TargetDatabase

Write-Host "Restoring data..." -ForegroundColor Green
Get-Content $BackupFile | & mysql @mysqlArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Database restored cleanly into '$TargetDatabase'." -ForegroundColor Green
} else {
    Write-Error "Restore failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

