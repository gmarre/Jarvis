<#
  MATH EDUCATION - Installation de la toolchain portable
  ------------------------------------------------------
  Installe Node.js et Python dans "Math Education\tools\", sans droits
  administrateur, sans rien ecrire dans le registre, sans toucher au reste
  du systeme. Le dossier tools/ est ignore par git (voir .gitignore).

  SUR UNE NOUVELLE MACHINE :
      git clone / git pull
      cd "Math Education"
      powershell -ExecutionPolicy Bypass -File .\scripts\setup-toolchain.ps1

  Les versions sont epinglees dans scripts\toolchain.json : toutes les machines
  du projet obtiennent exactement le meme environnement.

  ENSUITE, dans chaque nouveau terminal :
      . .\tools\activate.ps1

  Options :
      -Force    reinstalle meme si la bonne version est deja presente
      -SkipPip  n'installe pas les paquets Python (reseau limite)
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$SkipPip
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # sinon la barre de progression ralentit fortement les telechargements
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13 } catch { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 }

# --- Chemins ------------------------------------------------------------
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir          # ...\Math Education
$ToolsDir = Join-Path $ProjectRoot 'tools'
$CacheDir = Join-Path $ToolsDir '_downloads'
$NodeDir = Join-Path $ToolsDir 'node'
$PyDir = Join-Path $ToolsDir 'python'

$pins = Get-Content (Join-Path $ScriptDir 'toolchain.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$NodeVersion = $pins.node.version
$PyVersion = $pins.python.version

function Write-Step { param($m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "    OK  $m" -ForegroundColor Green }
function Write-Info { param($m) Write-Host "    $m" -ForegroundColor DarkGray }

Write-Host "MATH EDUCATION - toolchain portable" -ForegroundColor White
Write-Info "Destination : $ToolsDir"
Write-Info "Node $NodeVersion  |  Python $PyVersion"

New-Item -ItemType Directory -Force $ToolsDir | Out-Null
New-Item -ItemType Directory -Force $CacheDir | Out-Null

# --- Utilitaire de telechargement --------------------------------------
function Get-File {
    param([string]$Url, [string]$Dest)
    if (Test-Path $Dest) {
        Write-Info "deja telecharge : $(Split-Path $Dest -Leaf)"
        return
    }
    Write-Info "telechargement : $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing -TimeoutSec 600
}

# =======================================================================
#  NODE.JS
# =======================================================================
Write-Step "Node.js $NodeVersion"

$nodeExe = Join-Path $NodeDir 'node.exe'
$nodeInstalled = $false
if ((Test-Path $nodeExe) -and -not $Force) {
    $current = (& $nodeExe --version) -replace '^v', ''
    if ($current -eq $NodeVersion) {
        Write-Ok "Node $NodeVersion deja installe"
        $nodeInstalled = $true
    } else {
        Write-Info "version presente ($current) differente de la version epinglee, reinstallation"
    }
}

if (-not $nodeInstalled) {
    $nodeZipName = "node-v$NodeVersion-win-x64.zip"
    $nodeZip = Join-Path $CacheDir $nodeZipName
    Get-File "https://nodejs.org/dist/v$NodeVersion/$nodeZipName" $nodeZip

    # Verification d'integrite avec les sommes officielles publiees par nodejs.org
    Write-Info "verification SHA256"
    $shasums = (Invoke-WebRequest -Uri "https://nodejs.org/dist/v$NodeVersion/SHASUMS256.txt" -UseBasicParsing -TimeoutSec 120).Content
    $expected = ($shasums -split "`n" | Where-Object { $_ -match [regex]::Escape($nodeZipName) + '\s*$' }) -split '\s+' | Select-Object -First 1
    $actual = (Get-FileHash $nodeZip -Algorithm SHA256).Hash
    if (-not $expected) { throw "Somme SHA256 introuvable pour $nodeZipName" }
    if ($actual -ne $expected.ToUpper()) {
        Remove-Item $nodeZip -Force
        throw "Archive Node corrompue. Attendu $expected, obtenu $actual. Fichier supprime, relancer le script."
    }
    Write-Ok "SHA256 conforme"

    if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }
    $tmp = Join-Path $CacheDir 'node_extract'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive -Path $nodeZip -DestinationPath $tmp -Force
    # l'archive contient un dossier node-vX.Y.Z-win-x64 : on l'aplatit
    Move-Item (Join-Path $tmp "node-v$NodeVersion-win-x64") $NodeDir
    Remove-Item $tmp -Recurse -Force
    Write-Ok "Node installe dans tools\node"
}

Write-Info ("node " + (& $nodeExe --version))
$npmCmd = Join-Path $NodeDir 'npm.cmd'
if (Test-Path $npmCmd) { Write-Info ("npm  " + (& $npmCmd --version 2>$null)) }

# =======================================================================
#  PYTHON (distribution embeddable, entierement portable)
# =======================================================================
Write-Step "Python $PyVersion"

$pyExe = Join-Path $PyDir 'python.exe'
$pyInstalled = $false
if ((Test-Path $pyExe) -and -not $Force) {
    $current = (& $pyExe --version 2>&1) -replace '^Python\s+', ''
    if ($current.Trim() -eq $PyVersion) {
        Write-Ok "Python $PyVersion deja installe"
        $pyInstalled = $true
    } else {
        Write-Info "version presente ($current) differente de la version epinglee, reinstallation"
    }
}

if (-not $pyInstalled) {
    $pyZipName = "python-$PyVersion-embed-amd64.zip"
    $pyZip = Join-Path $CacheDir $pyZipName
    Get-File "https://www.python.org/ftp/python/$PyVersion/$pyZipName" $pyZip

    if (Test-Path $PyDir) { Remove-Item $PyDir -Recurse -Force }
    Expand-Archive -Path $pyZip -DestinationPath $PyDir -Force
    Write-Ok "Python extrait dans tools\python"

    # La distribution embeddable desactive par defaut le chargement des paquets
    # tiers. On reactive "import site" et on declare Lib\site-packages, sans quoi
    # pip serait installe mais introuvable a l'import.
    $pth = Get-ChildItem $PyDir -Filter 'python*._pth' | Select-Object -First 1
    if ($pth) {
        $lines = Get-Content $pth.FullName
        $patched = $lines | ForEach-Object { if ($_ -match '^\s*#\s*import\s+site\s*$') { 'import site' } else { $_ } }
        if ($patched -notcontains 'import site') { $patched += 'import site' }
        if ($patched -notcontains 'Lib\site-packages') { $patched += 'Lib\site-packages' }
        Set-Content $pth.FullName ($patched -join "`r`n") -Encoding ascii
        Write-Ok "$($pth.Name) configure (import site + Lib\site-packages)"
    } else {
        Write-Warning "Fichier ._pth introuvable : pip risque de ne pas fonctionner."
    }
}

Write-Info ((& $pyExe --version 2>&1) -join '')

# --- pip ----------------------------------------------------------------
if (-not $SkipPip) {
    $hasPip = $false
    try { & $pyExe -m pip --version *> $null; $hasPip = ($LASTEXITCODE -eq 0) } catch { $hasPip = $false }

    if (-not $hasPip) {
        Write-Step "Installation de pip"
        $getPip = Join-Path $CacheDir 'get-pip.py'
        if (Test-Path $getPip) { Remove-Item $getPip -Force }
        Get-File 'https://bootstrap.pypa.io/get-pip.py' $getPip
        & $pyExe $getPip --no-warn-script-location
        if ($LASTEXITCODE -ne 0) { throw "Echec de l'installation de pip." }
        Write-Ok "pip installe"
    }

    Write-Step "Paquets Python (scripts\requirements.txt)"
    $req = Join-Path $ScriptDir 'requirements.txt'
    $lock = Join-Path $ScriptDir 'requirements.lock.txt'
    # Si un verrou existe, il fait foi : c'est lui qui garantit un environnement
    # identique d'une machine a l'autre.
    $source = if (Test-Path $lock) { $lock } else { $req }
    Write-Info "source : $(Split-Path $source -Leaf)"
    & $pyExe -m pip install --disable-pip-version-check --no-warn-script-location -r $source
    if ($LASTEXITCODE -ne 0) { throw "Echec de l'installation des paquets Python." }

    if (-not (Test-Path $lock)) {
        & $pyExe -m pip freeze | Set-Content $lock -Encoding ascii
        Write-Ok "requirements.lock.txt genere (a committer : il fige les versions)"
    }
    Write-Ok "paquets Python installes"
} else {
    Write-Info "installation des paquets Python ignoree (-SkipPip)"
}

# =======================================================================
#  SCRIPTS D'ACTIVATION
# =======================================================================
Write-Step "Scripts d'activation"

$activatePs1 = @'
# MATH EDUCATION - active la toolchain portable pour le terminal courant.
# Usage (noter le point suivi d'un espace) :  . .\tools\activate.ps1
# Genere automatiquement par scripts\setup-toolchain.ps1 : ne pas editer.

$toolsDir = $PSScriptRoot
$nodeDir = Join-Path $toolsDir 'node'
$pyDir = Join-Path $toolsDir 'python'
$pyScripts = Join-Path $pyDir 'Scripts'

$env:PATH = "$nodeDir;$pyDir;$pyScripts;$env:PATH"

Write-Host "Toolchain MATH EDUCATION activee :" -ForegroundColor Green
Write-Host ("  node   " + (& (Join-Path $nodeDir 'node.exe') --version))
Write-Host ("  npm    " + (& (Join-Path $nodeDir 'npm.cmd') --version 2>$null))
Write-Host ("  python " + ((& (Join-Path $pyDir 'python.exe') --version 2>&1) -replace '^Python\s+',''))
Write-Host "Valable pour ce terminal uniquement." -ForegroundColor DarkGray
'@
Set-Content (Join-Path $ToolsDir 'activate.ps1') $activatePs1 -Encoding utf8

$activateCmd = @'
@echo off
REM MATH EDUCATION - active la toolchain portable pour l'invite de commandes courante.
REM Genere automatiquement par scripts\setup-toolchain.ps1 : ne pas editer.
set "PATH=%~dp0node;%~dp0python;%~dp0python\Scripts;%PATH%"
echo Toolchain MATH EDUCATION activee (node, npm, python, pip).
'@
Set-Content (Join-Path $ToolsDir 'activate.cmd') $activateCmd -Encoding ascii

Write-Ok "tools\activate.ps1 et tools\activate.cmd generes"

# =======================================================================
#  RESUME
# =======================================================================
Write-Host "`n----------------------------------------------------------" -ForegroundColor White
Write-Host " Installation terminee." -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor White
Write-Host " Dans chaque nouveau terminal PowerShell :"
Write-Host "     . `"$ToolsDir\activate.ps1`"" -ForegroundColor Yellow
Write-Host ""
Write-Host " Le dossier tools\ n'est PAS versionne (voir .gitignore)."
Write-Host " Sur une autre machine : git pull puis relancer ce script."
Write-Host ""
