export const dynamic = "force-dynamic";

import { getClientes } from "@/lib/actions/clientes";
import ClientesClient from "./clientes-client";

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient initialClientes={clientes} />;
}
