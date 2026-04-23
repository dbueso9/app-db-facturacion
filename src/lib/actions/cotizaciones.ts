"use server";

import { createServerClient } from "@/lib/supabase";
import { Cotizacion, EstadoCotizacion } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Cotizacion {
  const lineasRaw = (row.dbc_lineas_cotizacion as Record<string, unknown>[]) || [];
  const lineas = lineasRaw
    .map((l) => ({
      id: l.id as string,
      descripcion: l.descripcion as string,
      cantidad: Number(l.cantidad),
      precioUnitario: Number(l.precio_unitario),
      subtotal: Number(l.subtotal),
      orden: Number(l.orden ?? 0),
    }))
    .sort((a, b) => a.orden - b.orden)
    .map(({ orden: _orden, ...rest }) => rest);

  return {
    id: row.id as string,
    numero: row.numero as string,
    secuencia: Number(row.secuencia),
    fecha: (row.fecha as string).split("T")[0],
    fechaValidez: (row.fecha_validez as string).split("T")[0],
    clienteId: row.cliente_id as string,
    cliente: row.cliente_data as Cotizacion["cliente"],
    lineas,
    subtotal: Number(row.subtotal),
    isv: Number(row.isv),
    total: Number(row.total),
    estado: row.estado as EstadoCotizacion,
    nombreProyecto: (row.nombre_proyecto as string) || undefined,
    notas: (row.notas as string) || "",
    convertidaAFacturaId: (row.convertida_a_factura_id as string) || undefined,
    convertidaAContratoId: (row.convertida_a_contrato_id as string) || undefined,
    creadaEn: row.creada_en as string,
  };
}

export async function getCotizaciones(): Promise<Cotizacion[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_cotizaciones")
    .select(`*, dbc_lineas_cotizacion(*)`)
    .order("creada_en", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getCotizacion(id: string): Promise<Cotizacion | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_cotizaciones")
    .select(`*, dbc_lineas_cotizacion(*)`)
    .eq("id", id)
    .single();
  if (error) return null;
  return mapRow(data);
}

async function getSiguienteSecuencia(): Promise<number> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_cotizaciones")
    .select("secuencia")
    .order("secuencia", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return 1;
  return data[0].secuencia + 1;
}

export async function crearNumeroCotizacion(): Promise<{ secuencia: number; numero: string }> {
  const secuencia = await getSiguienteSecuencia();
  const numero = `COT-${String(secuencia).padStart(3, "0")}`;
  return { secuencia, numero };
}

export async function saveCotizacion(c: Cotizacion): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_cotizaciones").upsert({
    id: c.id,
    numero: c.numero,
    secuencia: c.secuencia,
    fecha: c.fecha,
    fecha_validez: c.fechaValidez,
    cliente_id: c.clienteId,
    cliente_data: c.cliente,
    subtotal: c.subtotal,
    isv: c.isv,
    total: c.total,
    estado: c.estado,
    nombre_proyecto: c.nombreProyecto || null,
    notas: c.notas,
    convertida_a_factura_id: c.convertidaAFacturaId || null,
    creada_en: c.creadaEn,
  });
  if (error) throw error;

  await supabase.from("dbc_lineas_cotizacion").delete().eq("cotizacion_id", c.id);

  if (c.lineas.length > 0) {
    const { error: lineasError } = await supabase.from("dbc_lineas_cotizacion").insert(
      c.lineas.map((l, idx) => ({
        id: l.id,
        cotizacion_id: c.id,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        subtotal: l.subtotal,
        orden: idx,
      }))
    );
    if (lineasError) throw lineasError;
  }
}

export async function updateEstadoCotizacion(id: string, estado: EstadoCotizacion): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_cotizaciones").update({ estado }).eq("id", id);
  if (error) throw error;
}

export async function marcarConvertida(id: string, facturaId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("dbc_cotizaciones")
    .update({ estado: "aceptada", convertida_a_factura_id: facturaId })
    .eq("id", id);
  if (error) throw error;
}

export async function marcarConvertidaAContrato(id: string, contratoId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("dbc_cotizaciones")
    .update({ estado: "aceptada", convertida_a_contrato_id: contratoId })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCotizacion(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_cotizaciones").delete().eq("id", id);
  if (error) throw error;
}
