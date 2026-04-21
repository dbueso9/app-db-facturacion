export const dynamic = "force-dynamic";

import { getFacturas } from "@/lib/actions/facturas";
import { getContratos } from "@/lib/actions/contratos";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const [facturas, contratos] = await Promise.all([getFacturas(), getContratos()]);
  return <DashboardClient facturas={facturas} contratos={contratos} />;
}
