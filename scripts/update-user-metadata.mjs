/**
 * Actualiza user_metadata (username + role) de los usuarios existentes en Supabase.
 *
 * Uso:
 *   node scripts/update-user-metadata.mjs
 *
 * Requiere las variables de entorno del archivo .env.local.
 * Ejecutar desde la raíz del proyecto:
 *   node -r dotenv/config scripts/update-user-metadata.mjs dotenv_config_path=.env.local
 *
 * O simplemente exportar las variables antes de correr:
 *   set NEXT_PUBLIC_SUPABASE_URL=https://omiodzulmcytponkhras.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
 *   node scripts/update-user-metadata.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env.local automáticamente si existe
try {
  const envPath = join(__dirname, "..", ".env.local");
  const raw = readFileSync(envPath, "utf-8");
  raw.split("\n").forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length && !process.env[key.trim()]) {
      process.env[key.trim()] = vals.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  });
  console.log("📄 .env.local cargado\n");
} catch {
  console.log("⚠️  Sin .env.local — usando variables de entorno del sistema\n");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltan variables de entorno:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const METADATA_POR_EMAIL = {
  "admin@dbconsulting.hn":     { username: "admin",     role: "admin" },
  "asistente@dbconsulting.hn": { username: "asistente", role: "asistente" },
};

const HEADERS = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  "Content-Type": "application/json",
};

async function listarUsuarios() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
    headers: HEADERS,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error listando usuarios: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.users ?? [];
}

async function actualizarMetadata(userId, metadata) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ user_metadata: metadata }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return await res.json();
}

async function main() {
  console.log("🔧 Actualizando user_metadata de usuarios existentes...\n");

  const usuarios = await listarUsuarios();
  console.log(`   ${usuarios.length} usuario(s) encontrado(s) en Supabase Auth\n`);

  for (const [email, metadata] of Object.entries(METADATA_POR_EMAIL)) {
    const user = usuarios.find((u) => u.email === email);

    if (!user) {
      console.log(`  ⚠️  "${email}" no existe — omitido`);
      continue;
    }

    const actualRole = user.user_metadata?.role;
    const actualUsername = user.user_metadata?.username;

    if (actualRole === metadata.role && actualUsername === metadata.username) {
      console.log(`  ✓  "${email}" ya tiene metadata correcta (role=${actualRole}) — sin cambios`);
      continue;
    }

    try {
      // Merge con metadata existente para no perder otros campos
      const metadataMerged = { ...user.user_metadata, ...metadata };
      await actualizarMetadata(user.id, metadataMerged);
      console.log(`  ✅ "${email}" actualizado → role=${metadata.role}, username=${metadata.username}`);
    } catch (err) {
      console.error(`  ❌ Error actualizando "${email}": ${err.message}`);
    }
  }

  console.log("\n✅ Proceso completado");
  console.log("\n💡 Los usuarios ya pueden crear nuevos usuarios desde /admin/usuarios");
  console.log("   y el rol admin verá el link 'Admin' en la barra de navegación.\n");
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
