import { notFound } from "next/navigation";
import { getCliente } from "@/lib/actions/clientes";
import { getContratos } from "@/lib/actions/contratos";
import { getFacturas } from "@/lib/actions/facturas";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import ClienteDetalleClient from "./cliente-detalle-client";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cliente, contratos, todasFacturas, tasa] = await Promise.all([
    getCliente(id),
    getContratos(id),
    getFacturas(),
    getTasaCambio().catch(() => null),
  ]);

  if (!cliente) notFound();

  const facturas = todasFacturas.filter((f) => f.clienteId === id);

  return (
    <ClienteDetalleClient
      cliente={cliente}
      contratos={contratos}
      facturas={facturas}
      tasaCambio={tasa}
    />
  );
}
