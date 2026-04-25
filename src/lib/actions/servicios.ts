"use server";

import { createServerClient } from "@/lib/supabase";
import { Servicio, CategoriaServicio } from "@/lib/types";

export async function getServicios(): Promise<Servicio[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_servicios")
    .select("*")
    .order("precio_base", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    precioBase: Number(row.precio_base),
    categoria: row.categoria as CategoriaServicio,
  }));
}

export async function saveServicio(servicio: Servicio): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_servicios").upsert({
    id: servicio.id,
    nombre: servicio.nombre,
    descripcion: servicio.descripcion,
    precio_base: servicio.precioBase,
    categoria: servicio.categoria,
  });
  if (error) throw error;
}

export async function deleteServicio(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_servicios").delete().eq("id", id);
  if (error) throw error;
}
