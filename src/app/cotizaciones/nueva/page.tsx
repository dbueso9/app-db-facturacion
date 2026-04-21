export const dynamic = "force-dynamic";

import { getClientes } from "@/lib/actions/clientes";
import { getServicios } from "@/lib/actions/servicios";
import NuevaCotizacionClient from "./nueva-client";

export default async function NuevaCotizacionPage() {
  const [clientes, servicios] = await Promise.all([getClientes(), getServicios()]);
  return <NuevaCotizacionClient clientes={clientes} servicios={servicios} />;
}
