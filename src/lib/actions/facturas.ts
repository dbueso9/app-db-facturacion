"use server";

import { createServerClient } from "@/lib/supabase";
import { Factura, EstadoFactura, MetodoPago } from "@/lib/types";

import { EMPRESA, formatNumeroFactura } from "@/lib/empresa";

export async function getFacturas(): Promise<Factura[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_facturas")
    .select(`*, dbc_lineas_factura(*)`)
    .order("creada_en", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => mapFacturaRow(row));
}

export async function getFactura(id: string): Promise<Factura | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_facturas")
    .select(`*, dbc_lineas_factura(*)`)
    .eq("id", id)
    .single();
  if (error) return null;
  return mapFacturaRow(data);
}

function mapFacturaRow(row: Record<string, unknown>): Factura {
  const lineasRaw = (row.dbc_lineas_factura as Record<string, unknown>[]) || [];
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
    fechaVencimiento: (row.fecha_vencimiento as string).split("T")[0],
    clienteId: row.cliente_id as string,
    cliente: row.cliente_data as Factura["cliente"],
    lineas,
    subtotal: Number(row.subtotal),
    descuento: Number(row.descuento ?? 0),
    isv: Number(row.isv),
    total: Number(row.total),
    estado: row.estado as EstadoFactura,
    metodoPago: (row.metodo_pago as MetodoPago) || undefined,
    condicionPago: row.condicion_pago ? Number(row.condicion_pago) : undefined,
    tasaCambio: row.tasa_cambio ? Number(row.tasa_cambio) : undefined,
    nombreProyecto: (row.nombre_proyecto as string) || undefined,
    notas: (row.notas as string) || "",
    creadaEn: row.creada_en as string,
  };
}

export async function getSiguienteSecuencia(): Promise<number> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_facturas")
    .select("secuencia")
    .neq("estado", "anulada")
    .order("secuencia", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return EMPRESA.secuenciaInicio;
  return data[0].secuencia + 1;
}

export async function crearNumeroFactura(): Promise<{ secuencia: number; numero: string }> {
  const secuencia = await getSiguienteSecuencia();
  return { secuencia, numero: formatNumeroFactura(secuencia) };
}

export async function saveFactura(factura: Factura): Promise<void> {
  const supabase = createServerClient();

  const payloadBase = {
    id: factura.id,
    numero: factura.numero,
    secuencia: factura.secuencia,
    fecha: factura.fecha,
    fecha_vencimiento: factura.fechaVencimiento,
    cliente_id: factura.clienteId,
    cliente_data: factura.cliente,
    subtotal: factura.subtotal,
    descuento: factura.descuento ?? 0,
    isv: factura.isv,
    total: factura.total,
    estado: factura.estado,
    metodo_pago: factura.metodoPago || null,
    tasa_cambio: factura.tasaCambio || null,
    nombre_proyecto: factura.nombreProyecto || null,
    notas: factura.notas,
    creada_en: factura.creadaEn,
  };

  // Intentar guardar con condicion_pago; si la columna no existe aún, guardar sin ella
  let { error: facturaError } = await supabase.from("dbc_facturas").upsert({
    ...payloadBase,
    condicion_pago: factura.condicionPago ?? null,
  });

  if (facturaError?.message?.includes("condicion_pago")) {
    const { error: retryError } = await supabase.from("dbc_facturas").upsert(payloadBase);
    facturaError = retryError;
  }

  if (facturaError) throw facturaError;

  // Delete existing lines then insert new ones
  await supabase.from("dbc_lineas_factura").delete().eq("factura_id", factura.id);

  if (factura.lineas.length > 0) {
    const { error: lineasError } = await supabase.from("dbc_lineas_factura").insert(
      factura.lineas.map((l, idx) => ({
        id: l.id,
        factura_id: factura.id,
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

export async function updateEstadoFactura(id: string, estado: EstadoFactura): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_facturas").update({ estado }).eq("id", id);
  if (error) throw error;
}

export async function deleteFactura(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("dbc_facturas").delete().eq("id", id);
  if (error) throw error;
}
