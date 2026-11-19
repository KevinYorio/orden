param([switch]$Foreground)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir
if (-not (Test-Path -LiteralPath '.env')) { throw 'Ejecutar instalación antes de iniciar.' }
if ($Foreground) { & node.exe --env-file-if-exists=.env dist/apps/service/src/main.js; exit $LASTEXITCODE }
$startInfo = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList '--env-file-if-exists=.env','dist/apps/service/src/main.js' -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru
Write-Output "Inicio solicitado para Asistente Hogar, PID $($startInfo.Id). Estado: http://127.0.0.1:4317"
