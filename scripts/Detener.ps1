$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
# El controlador lee .env y la credencial sin imprimirla; sólo llama a loopback.
& node.exe --env-file-if-exists=.env scripts/stop.mjs
if ($LASTEXITCODE -ne 0) { throw 'No se confirmó la parada local.' }
