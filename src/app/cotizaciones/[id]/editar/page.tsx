export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCotizacion } from "@/lib/actions/cotizaciones";
import { getClientes } from "@/lib/actions/clientes";
import { getServicios } from "@/lib/actions/servicios";
import EditarCotizacionClient from "./editar-client";

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cotizacion, clientes, servicios] = await Promise.all([
    getCotizacion(id),
    getClientes(),
    getServicios(),
  ]);
  if (!cotizacion) notFound();
  return <EditarCotizacionClient cotizacion={cotizacion} clientes={clientes} servicios={servicios} />;
}
