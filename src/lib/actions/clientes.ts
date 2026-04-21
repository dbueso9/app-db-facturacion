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
    codigo: row.codigo || "",
    nombre: row.nombre,
    rtn: row.rtn || "",
    direccion: row.direccion || "",
    correo: row.correo || "",
    telefono: row.telefono || "",
    creadoEn: row.creado_en,
  }));
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("dbc_clientes").select("*").eq("id", id).single();
  if (error) return null;
  return {
    id: data.id,
    codigo: data.codigo || "",
    nombre: data.nombre,
    rtn: data.rtn || "",
    direccion: data.direccion || "",
    correo: data.correo || "",
    telefono: data.telefono || "",
    creadoEn: data.creado_en,
  };
}

async function generarCodigo(): Promise<string> {
  const supabase = createServerClient();
  const { count } = await supabase.from("dbc_clientes").select("*", { count: "exact", head: true });
  const n = ((count || 0) + 1).toString().padStart(3, "0");
  return `DBC-${n}`;
}

export async function saveCliente(cliente: Cliente): Promise<void> {
  const supabase = createServerClient();
  const codigo = cliente.codigo || (await generarCodigo());
  const { error } = await supabase.from("dbc_clientes").upsert({
    id: cliente.id,
    codigo,
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
