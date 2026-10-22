<#
.SYNOPSIS
  Script d'automatisation et de configuration Fly.io pour CapVoyage.
  Exécute les 3 commandes de cadrage, crée l'application et le volume persistant.
#>

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🧭 CapVoyage - Assistant de Déploiement Fly.io" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Vérification de l'outil CLI flyctl
$flyBin = "$HOME\.fly\bin\flyctl.exe"
if (-not (Test-Path $flyBin)) {
    Write-Host "📦 Installation de flyctl..." -ForegroundColor Yellow
    iwr https://fly.io/install.ps1 -useb | iex
}

# 2. Vérification de la connexion
Write-Host "`n🔑 Vérification de votre session Fly.io..." -ForegroundColor Yellow
try {
    $whoami = & $flyBin auth whoami 2>&1
    if ($LASTEXITCODE -ne 0 -or $whoami -like "*no access token*") {
        Write-Host "Connexion requise. Le navigateur va s'ouvrir pour vous authentifier..." -ForegroundColor Yellow
        & $flyBin auth login
    } else {
        Write-Host "Connecté en tant que : $whoami" -ForegroundColor Green
    }
} catch {
    Write-Host "Connexion requise..." -ForegroundColor Yellow
    & $flyBin auth login
}

# 3. Nom de l'application
$appName = "capvoyage"
Write-Host "`n1️⃣ Création de l'application Fly.io ($appName)..." -ForegroundColor Yellow
$createAppResult = & $flyBin apps create $appName 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($createAppResult -like "*taken*") {
        $uniqueSuffix = (Get-Random -Minimum 1000 -Maximum 9999)
        $appName = "capvoyage-$uniqueSuffix"
        Write-Host "⚠️ Le nom 'capvoyage' est déjà pris. Nouveau nom généré : $appName" -ForegroundColor Yellow
        & $flyBin apps create $appName
        
        # Mise à jour dans fly.toml
        $flyToml = Get-Content "fly.toml" -Raw
        $flyToml = $flyToml -replace 'app = ".*"', "app = `"$appName`""
        Set-Content "fly.toml" -Value $flyToml
        Write-Host "✅ fly.toml mis à jour avec le nom : $appName" -ForegroundColor Green
    } else {
        Write-Host "Erreur : $createAppResult" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Application créée : $appName" -ForegroundColor Green
}

# 4. Création du volume persistant
Write-Host "`n2️⃣ Création du volume persistant SQLite (1 Go, région cdg)..." -ForegroundColor Yellow
& $flyBin volumes create capvoyage_data --region cdg --size 1 --app $appName --yes
Write-Host "✅ Volume 'capvoyage_data' créé avec succès !" -ForegroundColor Green

# 5. Création du jeton de déploiement pour GitHub Actions
Write-Host "`n3️⃣ Génération du jeton de déploiement GitHub Actions..." -ForegroundColor Yellow
$tokenOutput = & $flyBin tokens create deploy -x 999999h --app $appName
$token = ($tokenOutput | Select-String "FlyV1\S+").Matches.Value

if (-not $token) {
    $token = $tokenOutput.Trim()
}

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "🎉 INFRASTRUCTURE FLY.IO CONFIGURÉE AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "📋 Votre jeton de déploiement sécurisé :" -ForegroundColor Cyan
Write-Host "$token" -ForegroundColor White

try {
    Set-Clipboard -Value $token
    Write-Host "`n📎 Le jeton a été copié automatiquement dans votre presse-papier !" -ForegroundColor Green
} catch {}

Write-Host "`n👉 Prochaine étape :" -ForegroundColor Yellow
Write-Host "1. Allez sur votre dépôt GitHub : Settings > Secrets and variables > Actions > New repository secret"
Write-Host "2. Nom du secret : FLY_API_TOKEN"
Write-Host "3. Collez le jeton ci-dessus et enregistrez."
Write-Host "4. Poussez votre code : git push -u origin main"
Write-Host "`n🌐 Votre application sera accessible sur : https://$appName.fly.dev" -ForegroundColor Cyan

