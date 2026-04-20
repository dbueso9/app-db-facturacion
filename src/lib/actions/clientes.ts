"use server";

import { createServerClient } from "@/lib/supabase";
import { Cliente } from "@/lib/types";

export async function getClientes(): Promise<Cliente[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_clientes")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    nombre: row.nombre,
    rtn: row.rtn || "",
    direccion: row.direccion || "",
    correo: row.correo || "",
    telefono: row.telefono || "",
    creadoEn: row.creado_en,
  }));
}

export async function saveCliente(cliente: Cliente): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_clientes").upsert({
    id: cliente.id,
    nombre: cliente.nombre,
    rtn: cliente.rtn,
    direccion: cliente.direccion,
    correo: cliente.correo,
    telefono: cliente.telefono,
    creado_en: cliente.creadoEn,
  });
  if (error) throw error;
}

export async function deleteCliente(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_clientes").delete().eq("id", id);
  if (error) throw error;
}
