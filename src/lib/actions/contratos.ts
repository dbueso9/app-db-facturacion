"use server";

import { createServerClient } from "@/lib/supabase";
import { Contrato, TipoContrato } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Contrato {
  return {
    id: row.id as string,
    clienteId: row.cliente_id as string,
    nombreProyecto: row.nombre_proyecto as string,
    tipo: row.tipo as TipoContrato,
    valorBase: Number(row.valor_base),
    fechaInicio: (row.fecha_inicio as string).split("T")[0],
    diaFacturacion: Number(row.dia_facturacion) as 1 | 2,
    activo: Boolean(row.activo),
    notas: (row.notas as string) || "",
    creadoEn: row.creado_en as string,
  };
}

export async function getContratos(clienteId?: string): Promise<Contrato[]> {
  const supabase = createServerClient();
  let q = supabase.from("dbc_contratos").select("*").order("creado_en", { ascending: false });
  if (clienteId) q = q.eq("cliente_id", clienteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function saveContrato(c: Contrato): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_contratos").upsert({
    id: c.id,
    cliente_id: c.clienteId,
    nombre_proyecto: c.nombreProyecto,
    tipo: c.tipo,
    valor_base: c.valorBase,
    fecha_inicio: c.fechaInicio,
    dia_facturacion: c.diaFacturacion,
    activo: c.activo,
    notas: c.notas,
    creado_en: c.creadoEn,
  });
  if (error) throw error;
}

export async function toggleContratoActivo(id: string, activo: boolean): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_contratos").update({ activo }).eq("id", id);
  if (error) throw error;
}

export async function deleteContrato(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_contratos").delete().eq("id", id);
  if (error) throw error;
}

