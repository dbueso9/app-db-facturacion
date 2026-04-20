export const dynamic = "force-dynamic";

import { getFactura } from "@/lib/actions/facturas";
import { getClientes } from "@/lib/actions/clientes";
import { getServicios } from "@/lib/actions/servicios";
import { notFound, redirect } from "next/navigation";
import EditarClient from "./editar-client";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await getFactura(id);
  if (!factura) notFound();
  if (factura.estado !== "borrador") redirect(`/facturas/${id}`);

  const [clientes, servicios] = await Promise.all([
    getClientes(),
    getServicios(),
  ]);

  return <EditarClient factura={factura} clientes={clientes} servicios={servicios} />;
}
