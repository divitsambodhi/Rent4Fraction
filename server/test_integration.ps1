param (
    [string]$TargetDb = "event_rental_test"
)

# Load database/.env safely
$envFilePath = Join-Path $PSScriptRoot "..\database\.env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
}

$u = [Environment]::GetEnvironmentVariable("MYSQL_USER")
if (-not $u) { $u = "rental_user" }
$p = [Environment]::GetEnvironmentVariable("MYSQL_PASSWORD")
$h = [Environment]::GetEnvironmentVariable("MYSQL_HOST")
if (-not $h) { $h = "127.0.0.1" }
$port = [Environment]::GetEnvironmentVariable("MYSQL_PORT")
if (-not $port) { $port = "3306" }

# URL encode password using .NET
$encodedPass = [System.Net.WebUtility]::UrlEncode($p)
$env:TEST_DATABASE_URL = "mysql+pymysql://${u}:${encodedPass}@${h}:${port}/${TargetDb}?charset=utf8mb4"

Write-Host "Running integration tests against $TargetDb..." -ForegroundColor Cyan
& ".\.venv\Scripts\pytest.exe" -m integration -v
