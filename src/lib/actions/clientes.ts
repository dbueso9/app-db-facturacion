"use server";

import { createServerClient } from "@/lib/supabase";
import { Cliente } from "@/lib/types";

export async function getClientes(): Promise<Cliente[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_clientes")
    .select("*")
    .order("codigo");
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    codigo: row.codigo || "",
    nombre: row.nombre,
    rtn: row.rtn || "",
    direccion: row.direccion || "",
    correo: row.correo || "",
    correo2: row.correo2 || undefined,
    correo3: row.correo3 || undefined,
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
    correo2: data.correo2 || undefined,
    correo3: data.correo3 || undefined,
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
    correo2: cliente.correo2 || null,
    correo3: cliente.correo3 || null,
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

export async function checkRtnExiste(rtn: string, excludeId?: string): Promise<boolean> {
  if (!rtn || rtn.length !== 14) return false;
  const supabase = createServerClient();
  const { data } = await supabase.from("dbc_clientes").select("id").eq("rtn", rtn);
  if (!data || data.length === 0) return false;
  if (excludeId) return data.some((r: { id: string }) => r.id !== excludeId);
  return data.length > 0;
}
