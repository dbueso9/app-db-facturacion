export const dynamic = "force-dynamic";

import { getFactura } from "@/lib/actions/facturas";
import { notFound } from "next/navigation";
import FacturaDetalleClient from "./factura-detalle-client";

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await getFactura(id);
  if (!factura) notFound();
  return <FacturaDetalleClient factura={factura} />;
}
