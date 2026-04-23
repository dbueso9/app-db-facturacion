"use server";

import { createServerClient } from "@/lib/supabase";
import { generarId } from "@/lib/utils";

interface HitoInput {
  id: string;
  nombre: string;
  porcentaje: number;
  monto: number;
}

interface CrearProyectoParams {
  clienteId: string;
  nombreProyecto: string;
  valorBase: number;
  fechaInicio: string;
  notas: string;
  cotizacionId: string;
  hitos: HitoInput[];
}

export async function crearProyecto(params: CrearProyectoParams): Promise<void> {
  const supabase = createServerClient();
  const contratoId = generarId();
  const now = new Date().toISOString();

  const { error: contratoError } = await supabase.from("dbc_contratos").insert({
    id: contratoId,
    cliente_id: params.clienteId,
    nombre_proyecto: params.nombreProyecto,
    tipo: "proyecto_app",
    valor_base: params.valorBase,
    fecha_inicio: params.fechaInicio,
    dia_facturacion: 1,
    activo: true,
    notas: params.notas,
    creado_en: now,
  });
  if (contratoError) throw contratoError;

  if (params.hitos.length > 0) {
    const { error: hitosError } = await supabase.from("dbc_hitos").insert(
      params.hitos.map((h, idx) => ({
        id: h.id,
        contrato_id: contratoId,
        nombre: h.nombre,
        porcentaje: h.porcentaje,
        monto: h.monto,
        estado: "pendiente",
        factura_id: null,
        orden: idx,
        creado_en: now,
      }))
    );
    if (hitosError) throw hitosError;
  }

  const { error: cotizError } = await supabase
    .from("dbc_cotizaciones")
    .update({ estado: "aceptada", convertida_a_contrato_id: contratoId })
    .eq("id", params.cotizacionId);
  if (cotizError) throw cotizError;
}
