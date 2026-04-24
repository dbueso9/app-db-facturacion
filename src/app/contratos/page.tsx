export const dynamic = "force-dynamic";

import { getContratos } from "@/lib/actions/contratos";
import { getClientes } from "@/lib/actions/clientes";
import { getFacturas } from "@/lib/actions/facturas";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import { getCurrentUser } from "@/lib/supabase";
import ContratosClient from "./contratos-client";

export default async function ContratosPage() {
  const [contratos, clientes, facturas, tasa, user] = await Promise.all([
    getContratos(),
    getClientes(),
    getFacturas(),
    getTasaCambio().catch(() => null),
    getCurrentUser(),
  ]);

  const isAdmin = user?.user_metadata?.role === "admin" ||
    user?.email === "admin@dbconsulting.hn";
  const isGestion = user?.user_metadata?.role === "gestion";

  return (
    <ContratosClient
      contratos={contratos}
      clientes={clientes}
      facturas={facturas}
      tasaCambio={tasa}
      isAdmin={isAdmin}
      isGestion={isGestion}
    />
  );
}
