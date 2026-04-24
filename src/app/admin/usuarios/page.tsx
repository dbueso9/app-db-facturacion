export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase";
import { getUsuarios } from "@/lib/actions/usuarios";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (user?.user_metadata?.role !== "admin") {
    redirect("/");
  }
  const usuarios = await getUsuarios();
  return <UsuariosClient usuarios={usuarios} currentUserId={user.id} />;
}
