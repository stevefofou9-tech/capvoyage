# 🚀 Guide de Déploiement et de Mise en Production de CapVoyage

## Vue d'Ensemble de l'Architecture de Production

CapVoyage est une application web conçue selon les principes du **Spec-Driven Development (SDD)** et de l'architecture **Offline-First**. En production, elle repose sur un socle performant et autonome :
- **Moteur d'application :** Node.js 24 LTS (ES Modules natifs).
- **Persistance :** Moteur relationnel SQLite natif (`node:sqlite`) en mode **WAL (Write-Ahead Logging)** assurant des écritures concurrentes non-bloquantes, complété par un miroir de sauvegarde atomique JSON.
- **Authentification Sécurisée :** Codes magiques passwordless à 6 chiffres transmis par e-mail via l'API transactionnelle (Resend ou SMTP), protégés par rate-limiting et révocation après 5 erreurs.
- **Partage :** Consultation en lecture seule d'un séjour par jeton public `?share=...` résolu côté serveur avec verrouillage des écritures.
- **Client & PWA :** Interface responsive installable sur smartphone (iOS / Android) avec Service Worker et cache local.

---

## 1. Déploiement sur VPS avec Docker & Caddy (Recommandé)

Cette méthode offre un hébergement économique, autonome et ultra-rapide sur n'importe quel VPS (Hetzner, OVH, DigitalOcean, Scaleway, AWS EC2) avec gestion automatique du certificat SSL HTTPS par Caddy.

### 1.1 Prérequis sur le serveur
```bash
# Installation de Docker & Docker Compose sur Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

### 1.2 Cloner le projet et préparer l'environnement
```bash
cd /opt
git clone <URL_DU_DEPOT_CAPVOYAGE> capvoyage
cd capvoyage

# Créer le fichier d'environnement
cp .env.example .env
nano .env
```

Renseignez votre domaine et votre clé Resend dans `.env` :
```ini
NODE_ENV=production
PORT=3000
DATABASE_PATH=/app/data/capvoyage.db
ALLOWED_ORIGIN=https://voyage.votre-domaine.com
RESEND_API_KEY=re_votre_cle_resend
EMAIL_FROM="CapVoyage <auth@votre-domaine.com>"
```

### 1.3 Configuration de Caddy (Reverse Proxy & HTTPS Automatique)
Créez un fichier `/opt/capvoyage/Caddyfile` :
```caddy
voyage.votre-domaine.com {
    reverse_proxy localhost:3000
    encode gzip zstd
}
```

Lancez Caddy :
```bash
sudo apt install -y caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### 1.4 Lancement du conteneur CapVoyage
```bash
docker compose up -d --build
```

Vérifiez les logs :
```bash
docker compose logs -f capvoyage
```

---

## 2. Déploiement Continu Automatique sur Fly.io via GitHub Actions

Fly.io est la solution idéale pour exécuter CapVoyage : elle permet d'exécuter un conteneur au plus près des utilisateurs avec un **volume NVMe persistant** dédié à la base SQLite WAL et aux données de sessions / rate limiting.

### 2.1 Les 3 Commandes CLI préalables (À exécuter 1 seule fois)

Installez l'outil CLI [flyctl](https://fly.io/docs/hands-on/install-flyctl/) puis connectez-vous (`flyctl auth login`). Exécutez ensuite ces **3 commandes uniques** :

```bash
# 1. Création de l'application sur Fly.io (en utilisant le nom défini dans fly.toml)
flyctl apps create capvoyage

# 2. Création du volume persistant sur la même région (Paris / cdg, 1 Go NVMe)
flyctl volumes create capvoyage_data --region cdg --size 1 --app capvoyage

# 3. Génération du jeton de déploiement sécurisé pour GitHub Actions
flyctl tokens create deploy -x 999999h --app capvoyage
```

> [!IMPORTANT]
> - Si le nom `capvoyage` est déjà réservé sur Fly.io, remplacez-le par un identifiant unique (ex: `capvoyage-app-steve`) dans la commande ET dans le champ `app` du fichier `fly.toml`.
> - Copiez la clé secrète générée par la commande 3 (`FlyV1...`).

---

### 2.2 Configuration du Secret sur GitHub

1. Rendez-vous sur votre dépôt GitHub : **Settings > Secrets and variables > Actions**.
2. Cliquez sur **New repository secret**.
3. Nom : `FLY_API_TOKEN`.
4. Valeur : Collez le token généré à la commande 3.
5. *(Optionnel)* Définissez vos variables secrètes sur Fly.io :
   ```bash
   flyctl secrets set RESEND_API_KEY="re_votre_cle" ALLOWED_ORIGIN="https://capvoyage.fly.dev" --app capvoyage
   ```

---

### 2.3 Fonctionnement du Pipeline CI/CD Automatique

Le fichier [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) orchestre le déploiement sans intervention humaine :
1. **Étape `test` :** Les 89 tests automatisés sont exécutés en parallèle sur Node 22 et Node 24.
2. **Étape `deploy` :** Uniquement en cas de succès à 100% des tests et lors d'un `git push` sur `main` ou `master` :
   - L'action `superfly/flyctl-actions/setup-flyctl` installe `flyctl`.
   - La commande `flyctl deploy --remote-only` compile et déploie le conteneur sur l'infrastructure Fly.io.
   - Le volume persistant `capvoyage_data` est attaché automatiquement sur `/app/data`.
   - La sonde de santé `/health` vérifie la disponibilité avant de basculer le trafic.

---

## 3. Autres Plateformes Managées (Render, Railway)
1. Créez un nouveau **Web Service** connecté à votre dépôt Git.
2. Choisissez **Docker** comme environnement d'exécution.
3. Ajoutez un **Persistent Disk** monté sur `/app/data` (taille 1 Go à 5 Go amplement suffisante pour des millions d'activités et contacts).
4. Configurez les variables d'environnement dans l'onglet **Environment** (`NODE_ENV=production`, `RESEND_API_KEY=...`).
5. Déployez ! Le healthcheck `/health` sera automatiquement interrogé par Render.

---

## 3. Configuration du Fournisseur d'E-mails (Codes Magiques)

Pour permettre aux utilisateurs de recevoir leur code de connexion sans mot de passe :

1. Créez un compte gratuit sur [Resend.com](https://resend.com).
2. Ajoutez votre nom de domaine et vérifiez les enregistrements DNS (SPF, DKIM).
3. Générez une clé API et renseignez-la dans `RESEND_API_KEY`.
4. Renseignez l'adresse d'expédition validée dans `EMAIL_FROM` (ex: `CapVoyage <auth@votre-domaine.com>`).

> [!NOTE]
> Si aucune clé API n'est fournie (ou en local), CapVoyage fonctionne en mode simulation : le code est affiché dans les logs du serveur (`docker logs`) sans bloquer le processus.

---

## 4. Sauvegarde et Restauration de la Base de Données

Grâce à SQLite WAL, la sauvegarde de la base en production se fait sans interruption de service :

### 4.1 Sauvegarde manuelle instantanée
```bash
# Sauvegarde sécurisée SQLite en cours de fonctionnement
docker exec capvoyage-app node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('/app/data/capvoyage.db');
  db.exec(\"VACUUM INTO '/app/data/backup_$(date +%Y%m%d_%H%M%S).db'\");
  console.log('Sauvegarde SQLite terminée !');
"
```

### 4.2 Automatisation via Cron (Exemple quotidien à 3h du matin)
Ajoutez cette ligne dans votre crontab (`crontab -e`) :
```bash
0 3 * * * docker exec capvoyage-app node -e "const { DatabaseSync } = require('node:sqlite'); new DatabaseSync('/app/data/capvoyage.db').exec(\"VACUUM INTO '/app/data/backup_daily.db'\");"
```

---

## 5. Surveillance & Santé du Service (Monitoring)

L'application expose un endpoint standard de surveillance :
```bash
curl -i https://voyage.votre-domaine.com/health
```

Réponse type (HTTP 200) :
```json
{
  "status": "ok",
  "uptime": 86420,
  "environment": "production",
  "database": "sqlite-wal",
  "timestamp": "2026-10-22T20:10:00.000Z"
}
```
Ce statut peut être surveillé par un outil comme Uptime Kuma, Better Stack ou Datadog.
