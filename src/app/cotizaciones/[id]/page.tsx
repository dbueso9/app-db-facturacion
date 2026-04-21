export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCotizacion } from "@/lib/actions/cotizaciones";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import CotizacionDetalleClient from "./cotizacion-detalle-client";

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cotizacion, tasaCambio] = await Promise.all([
    getCotizacion(id),
    getTasaCambio().catch(() => null),
  ]);
  if (!cotizacion) notFound();
  return <CotizacionDetalleClient cotizacion={cotizacion} tasaCambio={tasaCambio} />;
}
