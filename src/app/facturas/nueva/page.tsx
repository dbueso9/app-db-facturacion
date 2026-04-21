export const dynamic = "force-dynamic";

import { getClientes } from "@/lib/actions/clientes";
import { getServicios } from "@/lib/actions/servicios";
import { getSiguienteSecuencia } from "@/lib/actions/facturas";
import { getTasaCambio } from "@/lib/actions/tasa-cambio";
import { EMPRESA } from "@/lib/empresa";
import NuevaFacturaClient from "./nueva-client";

export default async function NuevaFacturaPage() {
  const [clientes, servicios, siguienteSecuencia, tasa] = await Promise.all([
    getClientes(),
    getServicios(),
    getSiguienteSecuencia(),
    getTasaCambio().catch(() => null),
  ]);
  const limiteAlcanzado = siguienteSecuencia > EMPRESA.secuenciaFin;
  return (
    <NuevaFacturaClient
      clientes={clientes}
      servicios={servicios}
      limiteAlcanzado={limiteAlcanzado}
      tasaCambio={tasa}
    />
  );
}
