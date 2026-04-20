/**
 * Creates initial auth users in Supabase if they don't exist.
 * Runs automatically as part of the Vercel build (postbuild).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const USERS = [
  {
    email: "admin@dbconsulting.hn",
    password: "admin123",
    username: "admin",
    role: "admin",
    nombre: "Administrador",
  },
  {
    email: "asistente@dbconsulting.hn",
    password: "asis123",
    username: "asistente",
    role: "asistente",
    nombre: "Asistente",
  },
];

async function setupUsers() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log("⚠️  Supabase credentials not available, skipping user setup");
    return;
  }

  console.log("🔧 Setting up auth users...");

  for (const user of USERS) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            username: user.username,
            role: user.role,
            nombre: user.nombre,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(`  ✓ Usuario "${user.username}" creado`);
      } else if (
        data?.msg?.includes("already been registered") ||
        data?.code === "email_exists" ||
        data?.message?.includes("already exists")
      ) {
        console.log(`  ✓ Usuario "${user.username}" ya existe`);
      } else {
        console.warn(
          `  ✗ Error con "${user.username}":`,
          data?.msg || data?.message || res.status
        );
      }
    } catch (err) {
      console.warn(`  ✗ No se pudo crear "${user.username}":`, err?.message);
    }
  }

  console.log("✅ Setup de usuarios completado");
}

setupUsers();
