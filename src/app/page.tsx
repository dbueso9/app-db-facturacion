export const dynamic = "force-dynamic";

import { getFacturas } from "@/lib/actions/facturas";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const facturas = await getFacturas();
  return <DashboardClient facturas={facturas} />;
}
