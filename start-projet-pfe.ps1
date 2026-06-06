$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$runtimeDir = Join-Path $root ".codex-artifacts\runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Test-PortListening {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Start-Backend {
    if (Test-PortListening -Port 5123) {
        Write-Host "Backend deja lance sur http://localhost:5123"
        return
    }

    $out = Join-Path $runtimeDir "backend-api.out.log"
    $err = Join-Path $runtimeDir "backend-api.err.log"

    Start-Process `
        -FilePath "dotnet" `
        -ArgumentList @("run", "--project", "backend-aspnet-api\Web-Api\Web-Api.csproj", "--launch-profile", "http") `
        -WorkingDirectory $root `
        -RedirectStandardOutput $out `
        -RedirectStandardError $err `
        -WindowStyle Hidden | Out-Null

    Write-Host "Backend en demarrage sur http://localhost:5123"
}

function Start-Frontend {
    if (Test-PortListening -Port 5173) {
        Write-Host "Frontend deja lance sur http://127.0.0.1:5173"
        return
    }

    $out = Join-Path $runtimeDir "frontend-vite.out.log"
    $err = Join-Path $runtimeDir "frontend-vite.err.log"
    $frontendDir = Join-Path $root "frontend-react"

    Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
        -WorkingDirectory $frontendDir `
        -RedirectStandardOutput $out `
        -RedirectStandardError $err `
        -WindowStyle Hidden | Out-Null

    Write-Host "Frontend en demarrage sur http://127.0.0.1:5173"
}

function Wait-HttpOk {
    param(
        [string]$Url,
        [int]$Seconds = 45
    )

    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    return $false
}

Start-Backend
Start-Frontend

$apiOk = Wait-HttpOk -Url "http://localhost:5123/swagger/index.html"
$frontOk = Wait-HttpOk -Url "http://127.0.0.1:5173/"

if ($apiOk -and $frontOk) {
    Write-Host "Projet pret."
    Write-Host "Frontend: http://127.0.0.1:5173/"
    Write-Host "API Swagger: http://localhost:5123/swagger/index.html"
    Start-Process "http://127.0.0.1:5173/"
}
else {
    Write-Warning "Le lancement n'est pas totalement confirme. Consulte les logs dans $runtimeDir"
    Write-Host "Frontend: http://127.0.0.1:5173/"
    Write-Host "API Swagger: http://localhost:5123/swagger/index.html"
}
