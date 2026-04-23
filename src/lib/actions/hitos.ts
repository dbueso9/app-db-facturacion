"use server";

import { createServerClient } from "@/lib/supabase";
import { Hito, EstadoHito } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Hito {
  return {
    id: row.id as string,
    contratoId: row.contrato_id as string,
    nombre: row.nombre as string,
    porcentaje: Number(row.porcentaje),
    monto: Number(row.monto),
    estado: row.estado as EstadoHito,
    facturaId: (row.factura_id as string) || undefined,
    orden: Number(row.orden ?? 0),
    creadoEn: row.creado_en as string,
  };
}

export async function getHitosForContratos(contratoIds: string[]): Promise<Hito[]> {
  if (contratoIds.length === 0) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dbc_hitos")
    .select("*")
    .in("contrato_id", contratoIds)
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function saveHitos(contratoId: string, hitos: Omit<Hito, "contratoId" | "creadoEn">[]): Promise<void> {
  const suma = hitos.reduce((s, h) => s + h.porcentaje, 0);
  if (Math.abs(suma - 100) > 0.01) {
    throw new Error(`Los porcentajes deben sumar 100% (actualmente ${suma.toFixed(2)}%)`);
  }

  const supabase = createServerClient();

  // Preserve estado/facturaId for existing hitos already invoiced
  const { data: existing } = await supabase
    .from("dbc_hitos")
    .select("id, estado, factura_id")
    .eq("contrato_id", contratoId);

  const existingMap = new Map((existing || []).map((r: Record<string, unknown>) => [r.id as string, r]));

  await supabase.from("dbc_hitos").delete().eq("contrato_id", contratoId);

  if (hitos.length > 0) {
    const rows = hitos.map((h, idx) => {
      const prev = existingMap.get(h.id);
      return {
        id: h.id,
        contrato_id: contratoId,
        nombre: h.nombre,
        porcentaje: h.porcentaje,
        monto: h.monto,
        estado: prev ? (prev.estado as string) : "pendiente",
        factura_id: prev ? ((prev.factura_id as string) || null) : null,
        orden: idx,
        creado_en: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from("dbc_hitos").insert(rows);
    if (error) throw error;
  }
}

export async function marcarHitoFacturado(hitoId: string, facturaId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("dbc_hitos")
    .update({ estado: "facturado", factura_id: facturaId })
    .eq("id", hitoId);
  if (error) throw error;
}
