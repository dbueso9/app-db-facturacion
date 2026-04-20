export const dynamic = "force-dynamic";

import { getFacturas } from "@/lib/actions/facturas";
import FacturasClient from "./facturas-client";

export default async function FacturasPage() {
  const facturas = await getFacturas();
  return <FacturasClient initialFacturas={facturas} />;
}
