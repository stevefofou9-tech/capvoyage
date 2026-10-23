# ========================================================
# CapVoyage - Dockerfile de Production
# Image légère Node.js 24 Alpine, non-root, volume persistant
# ========================================================

FROM node:24-alpine AS runner

WORKDIR /app

# Définition de l'environnement de production
ENV NODE_ENV=production
ENV PORT=3000

# Création du dossier data pour le volume persistant SQLite
RUN mkdir -p /app/data && chown -R node:node /app

# Copie des définitions de paquets et code source
COPY --chown=node:node package.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node scripts/backup-db.js ./scripts/backup-db.js

# Déclaration du volume persistant pour les données (SQLite, voyages, utilisateurs)
VOLUME ["/app/data"]

# Exécution sous l'utilisateur non-privilégié node
USER node

# Exposition du port
EXPOSE 3000

# Healthcheck de production
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Commande de démarrage
CMD ["node", "src/server.js"]
