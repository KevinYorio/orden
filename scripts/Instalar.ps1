$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
& npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Falló compilación' }
& npm.cmd run setup
if ($LASTEXITCODE -ne 0) { throw 'Falló instalación local' }
