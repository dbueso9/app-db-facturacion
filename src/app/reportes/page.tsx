export const dynamic = "force-dynamic";

import { getFacturas } from "@/lib/actions/facturas";
import { getClientes } from "@/lib/actions/clientes";
import ReportesClient from "./reportes-client";

export default async function ReportesPage() {
  const [facturas, clientes] = await Promise.all([getFacturas(), getClientes()]);
  return <ReportesClient facturas={facturas} clientes={clientes} />;
}
