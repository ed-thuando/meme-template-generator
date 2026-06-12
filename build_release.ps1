# build_release.ps1 — Windows release build (NSIS .exe installer)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Log($msg) { Write-Host "▸ $msg" }

Log "Checking toolchain…"
foreach ($cmd in @("node", "npm", "cargo")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $cmd"
    }
}

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 18) { throw "Node.js 18+ required" }

Log "Installing JS dependencies…"
if (Test-Path "package-lock.json") { npm ci } else { npm install }

Log "Running production build…"
npm run tauri build

$releaseDir = Join-Path $PSScriptRoot "release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$nsis = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue
if (-not $nsis) { throw "No .exe found under src-tauri\target\release\bundle\nsis\" }

foreach ($f in $nsis) {
    Copy-Item -Force $f.FullName $releaseDir
    Log "EXE → $releaseDir\$($f.Name)"
}

Log "Done. Installer in: $releaseDir"
