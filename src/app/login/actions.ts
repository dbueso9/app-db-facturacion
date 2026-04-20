"use server";

import { createAuthClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

const USERNAME_EMAIL_MAP: Record<string, string> = {
  admin: "admin@dbconsulting.hn",
  asistente: "asistente@dbconsulting.hn",
};

export async function signIn(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  const email = USERNAME_EMAIL_MAP[username];
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
