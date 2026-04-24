"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/supabase";

export type RolUsuario = "admin" | "asistente" | "gestion";

export interface UsuarioApp {
  id: string;
  email: string;
  username: string;
  role: RolUsuario;
  creadoEn: string;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user?.user_metadata?.role !== "admin") {
    throw new Error("Acción reservada para administradores");
  }
}

export async function getUsuarios(): Promise<UsuarioApp[]> {
  await assertAdmin();
  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return (data.users || [])
    .filter((u) => u.email?.endsWith("@dbconsulting.hn"))
    .map((u) => {
      const usernameFromEmail = u.email!.replace("@dbconsulting.hn", "");
      return {
        id: u.id,
        email: u.email!,
        username: (u.user_metadata?.username as string) || usernameFromEmail,
        role: ((u.user_metadata?.role as RolUsuario) ||
          (usernameFromEmail === "admin" ? "admin" : "asistente")),
        creadoEn: u.created_at,
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function crearUsuario(
  username: string,
  password: string,
  role: RolUsuario
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const email = `${username.toLowerCase().trim()}@dbconsulting.hn`;
  const supabase = adminClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { username: username.toLowerCase().trim(), role },
    email_confirm: true,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function actualizarRolUsuario(
  userId: string,
  role: RolUsuario
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const supabase = adminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function actualizarPasswordUsuario(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const supabase = adminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarUsuario(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const currentUser = await getCurrentUser();
  if (currentUser?.id === userId) {
    return { ok: false, error: "No puedes eliminar tu propio usuario" };
  }
  const supabase = adminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
