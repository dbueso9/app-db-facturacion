export const dynamic = "force-dynamic";

import { getFactura } from "@/lib/actions/facturas";
import { getClientes } from "@/lib/actions/clientes";
import { getServicios } from "@/lib/actions/servicios";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import { notFound, redirect } from "next/navigation";
import EditarClient from "./editar-client";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await getFactura(id);
  if (!factura) notFound();
  if (factura.estado !== "borrador") redirect(`/facturas/${id}`);

  const [clientes, servicios, tasaCambio] = await Promise.all([
    getClientes(),
    getServicios(),
    getTasaCambio().catch(() => null),
  ]);

  return <EditarClient factura={factura} clientes={clientes} servicios={servicios} tasaCambio={tasaCambio} />;
}
