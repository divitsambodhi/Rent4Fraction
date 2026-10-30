# scripts/migrate_prod.ps1
# Runs production schema migrations against a verified managed MySQL database with safety guards.
param (
    [string]$DatabaseUrl = $env:PROD_DATABASE_URL,
    [string]$TargetHost = "",
    [int]$TargetPort = 3306,
    [string]$TargetUser = "",
    [string]$TargetPassword = "",
    [string]$TargetDatabase = "defaultdb",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Rent4Fraction Production Database Migration Guard" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Parse DatabaseUrl if provided
if ($DatabaseUrl) {
    if ($DatabaseUrl -match "mysql(?:\+pymysql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)") {
        $TargetUser = $Matches[1]
        $TargetPassword = [System.Uri]::UnescapeDataString($Matches[2])
        $TargetHost = $Matches[3]
        if ($Matches[4]) { $TargetPort = [int]$Matches[4] }
        $TargetDatabase = $Matches[5]
    } else {
        Write-Error "Invalid DatabaseUrl format. Expected mysql+pymysql://user:pass@host:port/dbname"
        exit 1
    }
}

if (-not $TargetHost -or -not $TargetUser) {
    Write-Host "Usage: .\scripts\migrate_prod.ps1 -DatabaseUrl 'mysql+pymysql://user:pass@host:port/dbname'" -ForegroundColor Yellow
    Write-Host "   or: .\scripts\migrate_prod.ps1 -TargetHost <host> -TargetPort <port> -TargetUser <user> -TargetPassword <pass> -TargetDatabase <db>" -ForegroundColor Yellow
    exit 1
}

# Host Allow-list Guard
$AllowedDomains = @("aivencloud.com", "railway.app", "planetscale.com", "amazonaws.com", "azure.com")
$IsWhitelisted = $false
foreach ($domain in $AllowedDomains) {
    if ($TargetHost.EndsWith($domain)) {
        $IsWhitelisted = $true
        break
    }
}

Write-Host "Target Host     : $TargetHost" -ForegroundColor White
Write-Host "Target Port     : $TargetPort" -ForegroundColor White
Write-Host "Target Database : $TargetDatabase" -ForegroundColor White
Write-Host "Target User     : $TargetUser" -ForegroundColor White

if (-not $IsWhitelisted) {
    Write-Host "WARNING: Target host '$TargetHost' is not in standard provider allow-list (Aiven, Railway, PlanetScale, AWS)." -ForegroundColor Red
    if (-not $Force) {
        $confirmHost = Read-Host "If this is a custom verified cloud host, type the host domain name again to confirm"
        if ($confirmHost -ne $TargetHost) {
            Write-Host "Aborted. Host mismatch." -ForegroundColor Red
            exit 1
        }
    }
}

if (-not $Force) {
    $confirmation = Read-Host "Type 'MIGRATE-PROD' to apply pending migrations to $TargetHost"
    if ($confirmation -ne "MIGRATE-PROD") {
        Write-Host "Migration aborted by operator." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Applying migrations..." -ForegroundColor Green
$env:MYSQL_HOST = $TargetHost
$env:MYSQL_PORT = "$TargetPort"
$env:MYSQL_USER = $TargetUser
$env:MYSQL_PASSWORD = $TargetPassword
$env:MYSQL_DATABASE = $TargetDatabase

$pythonExe = ".\server\.venv312\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

& $pythonExe database/scripts/migrate.py up

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Production migrations applied cleanly!" -ForegroundColor Green
} else {
    Write-Error "Migration failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

