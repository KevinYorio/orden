param([switch]$Desactivar)
$ErrorActionPreference = 'Stop'
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir 'Asistente Hogar.lnk'
if ($Desactivar) {
    if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath }
    Write-Output 'Inicio automático de Asistente Hogar desactivado.'
    exit
}
$shellObject = New-Object -ComObject WScript.Shell
$shortcut = $shellObject.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Get-Command powershell.exe).Source
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $PSScriptRoot 'Iniciar.ps1') + '"'
$shortcut.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Save()
# Acceso de escritorio al tablero; no contiene credenciales.
$desktopShortcut = $shellObject.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Asistente Hogar.lnk'))
$desktopShortcut.TargetPath = 'http://127.0.0.1:4317'
$desktopShortcut.Save()
Write-Output 'Inicio al iniciar sesión configurado para este usuario. No cambia suspensión ni políticas globales.'
