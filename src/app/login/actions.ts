"use server";

import { createClient } from "@supabase/supabase-js";
import { createAuthClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function emailParaUsername(username: string): Promise<string | null> {
  const supabase = adminSupabase();
  const { data } = await supabase.auth.admin.listUsers();
  const users = data?.users || [];

  // Primero busca por user_metadata.username (usuarios nuevos)
  const byMeta = users.find((u) => u.user_metadata?.username === username);
  if (byMeta?.email) return byMeta.email;

  // Fallback: email patrón (usuarios pre-existentes sin metadata)
  const emailFallback = `${username}@dbconsulting.hn`;
  const byEmail = users.find((u) => u.email === emailFallback);
  return byEmail?.email ?? null;
}

export async function signIn(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  const email = await emailParaUsername(username);
  if (!email) {
    return { error: "Usuario no encontrado" };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
