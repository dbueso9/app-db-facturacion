export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCotizacion } from "@/lib/actions/cotizaciones";
import CotizacionDetalleClient from "./cotizacion-detalle-client";

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cotizacion = await getCotizacion(id);
  if (!cotizacion) notFound();
  return <CotizacionDetalleClient cotizacion={cotizacion} />;
}
