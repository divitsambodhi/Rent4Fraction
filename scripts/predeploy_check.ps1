# scripts/predeploy_check.ps1
# Runs the full pre-deployment validation gate across client and server.
# Stops immediately if any check fails.
param (
    [switch]$SkipTests = $false,
    [switch]$IncludeAutobug = $false
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$repoRoot\server")) {
    $repoRoot = (Get-Location).Path
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Rent4Fraction Pre-Deployment Release Verification" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Server Doctor Diagnostics
Write-Host "`n[STEP 1/5] Running Server Environment & Service Doctor..." -ForegroundColor Yellow
Push-Location "$repoRoot\server"
try {
    $pythonExe = ".\.venv312\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }
    & $pythonExe -m app.cli doctor
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Server doctor checks failed!"
        exit 1
    }
} finally {
    Pop-Location
}

# 2. Server Unit Test Suite
if (-not $SkipTests) {
    Write-Host "`n[STEP 2/5] Running Server Test Suite..." -ForegroundColor Yellow
    Push-Location "$repoRoot\server"
    try {
        $pytestExe = ".\.venv312\Scripts\pytest.exe"
        if (-not (Test-Path $pytestExe)) { $pytestExe = "pytest" }
        & $pytestExe tests/unit
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Server unit tests failed!"
            exit 1
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[STEP 2/5] Server Test Suite skipped." -ForegroundColor Gray
}

# 3. Client Release Gate (Typecheck, Lint, Vitest, Build, Prod Bundle Check)
Write-Host "`n[STEP 3/5] Running Client Release Gate (typecheck, lint, test, build, bundle)..." -ForegroundColor Yellow
Push-Location "$repoRoot\client"
try {
    & npm run check:release
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Client check:release failed!"
        exit 1
    }

    if ($IncludeAutobug) {
        Write-Host "`n[STEP 3B] Running Autobug Fast Mode Scanner..." -ForegroundColor Yellow
        & npm run autobug:fast
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Autobug fast scan failed!"
            exit 1
        }
    }
} finally {
    Pop-Location
}

# 4. Strict Leftover Sweep in Client Dist
Write-Host "`n[STEP 4/5] Verifying Zero Forbidden Terms in Production Dist..." -ForegroundColor Yellow
$forbiddenTerms = @("DEV ONLY", "Preview as", "coming soon", "unsplash", "razorpay")
$distPath = "$repoRoot\client\dist"
$foundForbidden = $false

foreach ($term in $forbiddenTerms) {
    $matches = Get-ChildItem -Path $distPath -Recurse -File | Select-String -Pattern $term -SimpleMatch
    if ($matches) {
        Write-Host "  [FAIL] Found forbidden term '$term' in $($matches.Count) distribution files!" -ForegroundColor Red
        $foundForbidden = $true
    } else {
        Write-Host "  [PASS] Zero matches for '$term'" -ForegroundColor Green
    }
}

if ($foundForbidden) {
    Write-Error "Pre-deployment check failed: forbidden terms detected in client distribution bundle."
    exit 1
}

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  ALL PRE-DEPLOYMENT GATES PASSED! Build is deploy-ready." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
