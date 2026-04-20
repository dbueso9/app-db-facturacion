export const dynamic = "force-dynamic";

import { getServicios } from "@/lib/actions/servicios";
import ServiciosClient from "./servicios-client";

export default async function ServiciosPage() {
  const servicios = await getServicios();
  return <ServiciosClient initialServicios={servicios} />;
}
