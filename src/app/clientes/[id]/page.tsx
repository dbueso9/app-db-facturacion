import { notFound } from "next/navigation";
import { getCliente } from "@/lib/actions/clientes";
import { getContratos } from "@/lib/actions/contratos";
import { getFacturas } from "@/lib/actions/facturas";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import { getHitosForContratos } from "@/lib/actions/hitos";
import { getCurrentUser } from "@/lib/supabase";
import { Hito } from "@/lib/types";
import ClienteDetalleClient from "./cliente-detalle-client";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cliente, contratos, todasFacturas, tasa, user] = await Promise.all([
    getCliente(id),
    getContratos(id),
    getFacturas(),
    getTasaCambio().catch(() => null),
    getCurrentUser(),
  ]);

  if (!cliente) notFound();

  const facturas = todasFacturas.filter((f) => f.clienteId === id);
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.email === "admin@dbconsulting.hn";
  const isGestion = user?.user_metadata?.role === "gestion";

  const contratoIds = contratos.map((c) => c.id);
  const hitosArr = contratoIds.length > 0
    ? await getHitosForContratos(contratoIds).catch(() => [] as Hito[])
    : [];

  const hitosMap: Record<string, Hito[]> = {};
  hitosArr.forEach((h) => {
    if (!hitosMap[h.contratoId]) hitosMap[h.contratoId] = [];
    hitosMap[h.contratoId].push(h);
  });

  return (
    <ClienteDetalleClient
      cliente={cliente}
      contratos={contratos}
      facturas={facturas}
      tasaCambio={tasa}
      hitosMap={hitosMap}
      isAdmin={isAdmin}
      isGestion={isGestion}
    />
  );
}
