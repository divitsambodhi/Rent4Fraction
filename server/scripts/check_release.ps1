# Automated Release Gate for Rent4Fraction
$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName

Write-Host "`n==> [1/5] Running Client Typecheck..." -ForegroundColor Cyan
& npm --prefix "$RepoRoot\client" run typecheck
if ($LASTEXITCODE -ne 0) { throw "Client typecheck failed!" }

Write-Host "`n==> [2/5] Running Client Unit Tests..." -ForegroundColor Cyan
& npm --prefix "$RepoRoot\client" test -- --run
if ($LASTEXITCODE -ne 0) { throw "Client unit tests failed!" }

Write-Host "`n==> [3/5] Building Production Client Bundle..." -ForegroundColor Cyan
& npm --prefix "$RepoRoot\client" run build
if ($LASTEXITCODE -ne 0) { throw "Client build failed!" }

Write-Host "`n==> [4/5] Running Production Bundle Guard..." -ForegroundColor Cyan
& node "$RepoRoot\client\scripts\check-prod-bundle.mjs"
if ($LASTEXITCODE -ne 0) { throw "Production bundle inspection failed!" }

Write-Host "`n==> [5/5] Running Server Unit Tests..." -ForegroundColor Cyan
$ServerDir = "$RepoRoot\server"
Set-Location $ServerDir
& "$ServerDir\.venv312\Scripts\python.exe" -m pytest "tests/unit"
if ($LASTEXITCODE -ne 0) { throw "Server unit tests failed!" }

Write-Host "`n✅ All release gates PASSED! Ready for production release.`n" -ForegroundColor Green

