// Sauvegarde à chaud de la base SQLite CapVoyage (NFR-6, audit P4).
// `VACUUM INTO` produit une copie cohérente même pendant l'écriture (mode WAL).
//
// Usage : node scripts/backup-db.js [dossier_cible] [nombre_a_conserver]
//   Sur Fly : fly ssh console -C "node /app/scripts/backup-db.js /app/data/backups 7"
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'capvoyage.db');
const targetDir = process.argv[2] || path.join(path.dirname(dbPath), 'backups');
const keep = Number(process.argv[3] || 7);

mkdirSync(targetDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(targetDir, `capvoyage-${stamp}.db`);

const db = new DatabaseSync(dbPath, { readOnly: true });
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
console.log(`[backup] Sauvegarde créée : ${target}`);

// Rotation : ne garder que les `keep` sauvegardes les plus récentes
const backups = readdirSync(targetDir).filter(f => /^capvoyage-.*\.db$/.test(f)).sort();
for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
  rmSync(path.join(targetDir, old));
  console.log(`[backup] Ancienne sauvegarde supprimée : ${old}`);
}
