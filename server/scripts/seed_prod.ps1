# scripts/seed_prod.ps1
# Seeds production baseline data (standard equipment categories only).
# STOPS AND REFUSES TO SEED ANY MOCK USERS, FAKE EQUIPMENT, OR DEMO ORDERS.
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
Write-Host "  Rent4Fraction Production Baseline Data Seeder" -ForegroundColor Cyan
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
        Write-Error "Invalid DatabaseUrl format."
        exit 1
    }
}

if (-not $TargetHost -or -not $TargetUser) {
    Write-Host "Usage: .\scripts\seed_prod.ps1 -DatabaseUrl 'mysql+pymysql://user:pass@host:port/dbname'" -ForegroundColor Yellow
    exit 1
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$repoRoot\database")) {
    $repoRoot = (Get-Location).Path
}

$CategorySeedFile = "$repoRoot\database\seeds\002_categories.sql"
if (-not (Test-Path $CategorySeedFile)) {
    Write-Error "Categories seed file missing at $CategorySeedFile"
    exit 1
}

Write-Host "Target Host     : $TargetHost" -ForegroundColor White
Write-Host "Target Database : $TargetDatabase" -ForegroundColor White
Write-Host "Allowed Seed    : $CategorySeedFile (Categories ONLY)" -ForegroundColor Green
Write-Host "Forbidden Seeds : 001_admin_and_users, 003_vendors_equipment, 004_sample_bookings (EXCLUDED)" -ForegroundColor Yellow

if (-not $Force) {
    $confirmation = Read-Host "Type 'SEED-PROD-CATEGORIES' to apply standard category records"
    if ($confirmation -ne "SEED-PROD-CATEGORIES") {
        Write-Host "Production seed aborted." -ForegroundColor Red
        exit 0
    }
}

Write-Host "Executing category seed via MySQL client..." -ForegroundColor Green

$mysqlExe = "mysql"
$mysqlArgs = @(
    "-h", $TargetHost,
    "-P", "$TargetPort",
    "-u", $TargetUser,
    "-p$TargetPassword",
    $TargetDatabase,
    "--default-character-set=utf8mb4"
)

Get-Content $CategorySeedFile | & $mysqlExe @mysqlArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Production category taxonomy seeded successfully!" -ForegroundColor Green
} else {
    Write-Error "Seeding failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

