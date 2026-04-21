export const dynamic = "force-dynamic";

import { getCotizaciones } from "@/lib/actions/cotizaciones";
import CotizacionesClient from "./cotizaciones-client";

export default async function CotizacionesPage() {
  const cotizaciones = await getCotizaciones();
  return <CotizacionesClient cotizaciones={cotizaciones} />;
}
